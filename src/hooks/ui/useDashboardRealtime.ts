/**
 * هوك موحد لاشتراكات Realtime في لوحات التحكم
 * يستخدم useBfcacheSafeChannel لضمان التوافق مع bfcache
 * يضيف debounce لتجميع التغييرات المتزامنة في إبطال واحد
 */
import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBfcacheSafeChannel } from '@/hooks/ui/useBfcacheSafeChannel';

const DEBOUNCE_MS = 500;

/**
 * يشترك في تغييرات Realtime على الجداول المحددة ويبطل الكاش تلقائياً
 * @param channelName اسم فريد للقناة
 * @param tables أسماء الجداول المراد مراقبتها
 * @param enabled تفعيل/تعطيل الاشتراك
 * @param extraKeys مفاتيح إضافية تُبطل عند أي تغيير (مثل ['dashboard-summary'])
 */
export const useDashboardRealtime = (
  channelName: string,
  tables: readonly string[],
  enabled: boolean = true,
  extraKeys: readonly (readonly string[])[] = [],
) => {
  const queryClient = useQueryClient();

  // تثبيت مرجع الجداول لمنع إعادة الاشتراك عند تغيّر مرجع المصفوفة
  const tablesKey = JSON.stringify(tables);
  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  // تثبيت مرجع المفاتيح الإضافية
  const extraKeysKey = JSON.stringify(extraKeys);
  const extraKeysRef = useRef(extraKeys);
  extraKeysRef.current = extraKeys;

  // مرجع لتجميع الجداول المتغيرة مع debounce
  const pendingTablesRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushInvalidations = useCallback(() => {
    const pending = pendingTablesRef.current;
    if (pending.size === 0) return;
    // إبطال كاش الجداول المتغيرة دفعة واحدة
    pending.forEach((table) => {
      queryClient.invalidateQueries({ queryKey: [table], exact: false });
    });
    // إبطال المفاتيح الإضافية
    extraKeysRef.current.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [...key], exact: false });
    });
    pending.clear();
  }, [queryClient]);

  const subscribeFn = useCallback(
    (channel: Parameters<Parameters<typeof useBfcacheSafeChannel>[1]>[0]) => {
      tablesRef.current.forEach((table) => {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => {
            // تجميع التغييرات مع debounce بدلاً من إبطال فوري
            pendingTablesRef.current.add(table);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(flushInvalidations, DEBOUNCE_MS);
          },
        );
      });
    },
    // tablesKey يتغير فقط عند تغيّر محتوى المصفوفة فعلياً
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, tablesKey, extraKeysKey, flushInvalidations],
  );

  useBfcacheSafeChannel(channelName, subscribeFn, enabled);
};
