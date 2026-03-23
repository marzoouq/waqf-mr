/**
 * هوك آمن للـ bfcache — يلف supabase.channel() مع إدارة pagehide/pageshow
 * يفصل WebSocket عند مغادرة الصفحة (يسمح بـ bfcache)
 * ويعيد الاتصال عند العودة من bfcache
 */
import { useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

type SubscribeFn = (channel: RealtimeChannel) => void;

export const useBfcacheSafeChannel = (
  channelName: string,
  subscribeFn: SubscribeFn,
  enabled: boolean = true,
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  // ref ثابت لمنع إعادة إنشاء القناة عند تغيّر function reference
  const subscribeFnRef = useRef<SubscribeFn>(subscribeFn);
  subscribeFnRef.current = subscribeFn;

  const initChannel = useCallback(() => {
    // تنظيف أي قناة قديمة قبل البدء
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(channelName);
    subscribeFnRef.current(channel);
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logger.warn(`[BfcacheSafe] Channel ${channelName} error/timeout`);
      }
    });
    channelRef.current = channel;
  }, [channelName]);

  useEffect(() => {
    if (!enabled) return;

    initChannel();

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        logger.info(`[BfcacheSafe] Restoring channel: ${channelName}`);
        initChannel();
      }
    };

    const handlePageHide = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      // Cleanup عند الـ Unmount العادي — منع Memory Leak
      handlePageHide();
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [initChannel, enabled]);
};
