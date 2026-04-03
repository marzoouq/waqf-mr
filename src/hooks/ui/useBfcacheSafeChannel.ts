/**
 * هوك آمن للـ bfcache — يلف قنوات Realtime مع إدارة pagehide/pageshow
 */
import { useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createRealtimeChannel, removeRealtimeChannel, getRealtimeChannels } from '@/lib/realtime/channelFactory';
import { logger } from '@/lib/logger';

type SubscribeFn = (channel: RealtimeChannel) => void;

const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

export const useBfcacheSafeChannel = (
  channelName: string,
  subscribeFn: SubscribeFn,
  enabled: boolean = true,
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const instanceIdRef = useRef(`i${Math.random().toString(36).slice(2, 10)}`);
  const subscribeFnRef = useRef<SubscribeFn>(subscribeFn);
  subscribeFnRef.current = subscribeFn;
  const fallbackChannelName = `${channelName}-${instanceIdRef.current}`;

  const clearRetry = useCallback(() => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  const removeStaleScopedChannels = useCallback((targetChannelName: string) => {
    const channels = getRealtimeChannels();
    if (!channels) return;

    const targetTopic = `realtime:${targetChannelName}`;
    channels.forEach((ch) => {
      const topic = (ch as RealtimeChannel & { topic?: string }).topic;
      if (topic === targetTopic) {
        removeRealtimeChannel(ch);
      }
    });
  }, []);

  const teardown = useCallback(() => {
    clearRetry();
    if (channelRef.current) {
      removeRealtimeChannel(channelRef.current);
      channelRef.current = null;
    }
    removeStaleScopedChannels(channelName);
    removeStaleScopedChannels(fallbackChannelName);
  }, [clearRetry, removeStaleScopedChannels, channelName, fallbackChannelName]);

  const initChannel = useCallback(() => {
    teardown();
    removeStaleScopedChannels(channelName);

    const attachSubscription = (activeChannel: RealtimeChannel, activeName: string) => {
      activeChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          attemptRef.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn(`[BfcacheSafe] Channel ${activeName} ${status}, retrying…`);
          const delay = Math.min(
            INITIAL_BACKOFF_MS * Math.pow(2, attemptRef.current),
            MAX_BACKOFF_MS,
          );
          attemptRef.current += 1;
          clearRetry();
          retryRef.current = setTimeout(() => {
            initChannel();
          }, delay);
        }
      });
      channelRef.current = activeChannel;
    };

    const channel = createRealtimeChannel(channelName);
    try {
      subscribeFnRef.current(channel);
      attachSubscription(channel, channelName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isSubscribeOrderRace = /after\s*`?subscribe\(\)`?/i.test(errorMessage);
      removeRealtimeChannel(channel);

      if (isSubscribeOrderRace) {
        removeStaleScopedChannels(fallbackChannelName);
        const fallbackChannel = createRealtimeChannel(fallbackChannelName);
        try {
          subscribeFnRef.current(fallbackChannel);
          attachSubscription(fallbackChannel, fallbackChannelName);
          return;
        } catch (fallbackError) {
          logger.error(`[BfcacheSafe] Failed to register callbacks for fallback ${fallbackChannelName}:`, fallbackError);
          removeRealtimeChannel(fallbackChannel);
        }
      } else {
        logger.error(`[BfcacheSafe] Failed to register callbacks for ${channelName}:`, error);
      }

      const delay = Math.min(
        INITIAL_BACKOFF_MS * Math.pow(2, attemptRef.current),
        MAX_BACKOFF_MS,
      );
      attemptRef.current += 1;
      clearRetry();
      retryRef.current = setTimeout(() => {
        initChannel();
      }, delay);
      return;
    }
  }, [teardown, removeStaleScopedChannels, channelName, fallbackChannelName, clearRetry]);

  useEffect(() => {
    if (!enabled) return;

    initChannel();

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        logger.info(`[BfcacheSafe] Restoring channel: ${channelName}`);
        attemptRef.current = 0;
        initChannel();
      }
    };

    const handlePageHide = () => {
      teardown();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      teardown();
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [initChannel, enabled, channelName, teardown]);
};
