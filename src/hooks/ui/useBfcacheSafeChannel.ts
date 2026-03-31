/**
 * هوك آمن للـ bfcache — يلف supabase.channel() مع إدارة pagehide/pageshow
 * يفصل WebSocket عند مغادرة الصفحة (يسمح بـ bfcache)
 * ويعيد الاتصال عند العودة من bfcache
 * يدعم إعادة الاتصال التلقائي مع exponential backoff عند فشل القناة
 */
import { useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

type SubscribeFn = (channel: RealtimeChannel) => void;

/** الحد الأقصى لتأخير إعادة المحاولة (30 ثانية) */
const MAX_BACKOFF_MS = 30_000;
/** التأخير الأولي (1 ثانية) */
const INITIAL_BACKOFF_MS = 1_000;

export const useBfcacheSafeChannel = (
  channelName: string,
  subscribeFn: SubscribeFn,
  enabled: boolean = true,
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  // معرّف فريد لكل instance لتجنب تصادم topic بين mount/unmount السريع
  const instanceIdRef = useRef(`i${Math.random().toString(36).slice(2, 10)}`);
  // ref ثابت لمنع إعادة إنشاء القناة عند تغيّر function reference
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
    const getChannels = (supabase as unknown as { getChannels?: () => RealtimeChannel[] }).getChannels;
    if (typeof getChannels !== 'function') return;

    const targetTopic = `realtime:${targetChannelName}`;
    const channels = (() => {
      try {
        return getChannels();
      } catch {
        return null;
      }
    })();
    if (!channels) return;

    channels.forEach((ch) => {
      const topic = (ch as RealtimeChannel & { topic?: string }).topic;
      if (topic === targetTopic) {
        supabase.removeChannel(ch);
      }
    });
  }, []);

  const teardown = useCallback(() => {
    clearRetry();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    removeStaleScopedChannels(channelName);
    removeStaleScopedChannels(fallbackChannelName);
  }, [clearRetry, removeStaleScopedChannels, channelName, fallbackChannelName]);

  const initChannel = useCallback(() => {
    // تنظيف أي قناة قديمة قبل البدء
    teardown();

    // تنظيف وقائي من قنوات قديمة بنفس الاسم الأساسي
    removeStaleScopedChannels(channelName);

    const attachSubscription = (activeChannel: RealtimeChannel, activeName: string) => {
      activeChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // نجاح — إعادة تعيين عدّاد المحاولات
          attemptRef.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn(`[BfcacheSafe] Channel ${activeName} ${status}, retrying…`);
          // حساب التأخير التصاعدي: min(2^attempt * 1s, 30s)
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

    const channel = supabase.channel(channelName);
    try {
      subscribeFnRef.current(channel);
      attachSubscription(channel, channelName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isSubscribeOrderRace = /after\s*`?subscribe\(\)`?/i.test(errorMessage);
      supabase.removeChannel(channel);

      if (isSubscribeOrderRace) {
        // fallback defensive path: use unique channel topic when base topic is already subscribed elsewhere
        removeStaleScopedChannels(fallbackChannelName);
        const fallbackChannel = supabase.channel(fallbackChannelName);
        try {
          subscribeFnRef.current(fallbackChannel);
          attachSubscription(fallbackChannel, fallbackChannelName);
          return;
        } catch (fallbackError) {
          logger.error(`[BfcacheSafe] Failed to register callbacks for fallback ${fallbackChannelName}:`, fallbackError);
          supabase.removeChannel(fallbackChannel);
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
      // Cleanup عند الـ Unmount العادي — منع Memory Leak
      teardown();
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [initChannel, enabled, channelName, teardown]);
};
