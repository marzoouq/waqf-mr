/**
 * هوك موحد لاشتراكات Realtime في لوحات التحكم.
 * موضوع في hooks/data لأنه يتعامل مع تدفق بيانات وتحديث الكاش.
 */
import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBfcacheSafeChannel } from '@/hooks/ui/useBfcacheSafeChannel';

/**
 * يشترك في تغييرات Realtime على الجداول المحددة ويبطل الكاش تلقائياً.
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

  const tablesKey = JSON.stringify(tables);
  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  const subscribeFn = useCallback(
    (channel: Parameters<Parameters<typeof useBfcacheSafeChannel>[1]>[0]) => {
      tablesRef.current.forEach((table) => {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => {
            queryClient.invalidateQueries({ queryKey: [table], exact: false });
          },
        );
      });
    },
    // tablesKey يتغير فقط عند تغيّر محتوى المصفوفة فعلياً
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, tablesKey],
  );

  useBfcacheSafeChannel(channelName, subscribeFn, enabled);
};
