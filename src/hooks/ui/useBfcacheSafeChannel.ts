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
  // ref ثابت لمنع إعادة إنشاء القناة عند تغيّر function reference
  const subscribeFnRef = useRef<SubscribeFn>(subscribeFn);
  subscribeFnRef.current = subscribeFn;

  const clearRetry = useCallback(() => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    clearRetry();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [clearRetry]);

  const initChannel = useCallback(() => {
    // تنظيف أي قناة قديمة قبل البدء
    teardown();

    const channel = supabase.channel(channelName);
    subscribeFnRef.current(channel);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // نجاح — إعادة تعيين عدّاد المحاولات
        attemptRef.current = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logger.warn(`[BfcacheSafe] Channel ${channelName} ${status}, retrying…`);
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
    channelRef.current = channel;
  }, [channelName, teardown, clearRetry]);

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
