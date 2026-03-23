/**
 * هوك موحد لاشتراكات Realtime في لوحات التحكم
 * يستخدم useBfcacheSafeChannel لضمان التوافق مع bfcache
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBfcacheSafeChannel } from '@/hooks/useBfcacheSafeChannel';

/**
 * يشترك في تغييرات Realtime على الجداول المحددة ويبطل الكاش تلقائياً
 * @param channelName اسم فريد للقناة
 * @param tables أسماء الجداول المراد مراقبتها
 * @param enabled تفعيل/تعطيل الاشتراك
 */
export const useDashboardRealtime = (
  channelName: string,
  tables: readonly string[],
  enabled: boolean = true,
) => {
  const queryClient = useQueryClient();

  const subscribeFn = useCallback(
    (channel: Parameters<Parameters<typeof useBfcacheSafeChannel>[1]>[0]) => {
      tables.forEach((table) => {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => {
            queryClient.invalidateQueries({ queryKey: [table] });
          },
        );
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, ...tables],
  );

  useBfcacheSafeChannel(channelName, subscribeFn, enabled);
};
