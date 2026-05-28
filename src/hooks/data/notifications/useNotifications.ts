import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useMemo } from 'react';
import type { Notification } from '@/types';
import { logger } from '@/lib/logger';
import { useNotificationActions } from './useNotificationActions';
import { useNotificationSettings } from '@/hooks/data/settings/notifications/useNotificationSettings';
import { useNotificationVisibilityPrefs } from './useNotificationVisibilityPrefs';
import { shouldHideForBeneficiary } from '@/lib/notifications/beneficiaryNotificationVisibility';

// إعادة تصدير للتوافق
export type { Notification };
export {
  NOTIFICATION_TONE_KEY, NOTIFICATION_VOLUME_KEY, NOTIF_PREFS_KEY,
} from '@/constants/notificationTones';
export type { VolumeLevel, ToneId, ToneOption } from '@/constants/notificationTones';
export { VOLUME_OPTIONS, TONE_OPTIONS, previewTone } from '@/constants/notificationTones';

const PAGE_SIZE = 50;

export const useNotifications = () => {
  const { user, role } = useAuth();
  const { notificationSettings } = useNotificationSettings();
  const disabledTypes = useNotificationVisibilityPrefs();


  const userId = user?.id ?? '';

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['notifications', userId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      let query = supabase
        .from('notifications')
        .select('id, title, message, type, is_read, link, created_at, user_id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (pageParam) {
        const [cursorTs, cursorId] = pageParam.split('|');
        query = query.or(`created_at.lt.${cursorTs},and(created_at.eq.${cursorTs},id.lt.${cursorId})`);
      }
      const { data, error } = await query;
      if (error) { logger.error('Notifications fetch error:', error); throw error; }
      return (data || []) as Notification[];
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last ? `${last.created_at}|${last.id}` : undefined;
    },
    enabled: !!user && userId.length > 0,
  });

  const allNotificationsRaw = useMemo(() => (infiniteQuery.data?.pages ?? []).flat(), [infiniteQuery.data]);

  // طبقة حماية: إخفاء إشعارات العقود الإدارية عن المستفيد إن عُطِّلت في الإعدادات
  const allNotifications = useMemo(() => {
    if (role !== 'beneficiary') return allNotificationsRaw;
    return allNotificationsRaw.filter(n => !shouldHideForBeneficiary(n, notificationSettings));
  }, [allNotificationsRaw, role, notificationSettings]);

  const unreadCount = useMemo(() => allNotifications.filter(n => !n.is_read).length, [allNotifications]);
  const filteredData = useMemo(() => allNotifications.filter(n => !disabledTypes.has(n.type)), [allNotifications, disabledTypes]);
  const filteredUnreadCount = useMemo(() => filteredData.filter(n => !n.is_read).length, [filteredData]);

  // mutations + realtime — مستخرجة في هوك فرعي
  const { markAsRead, markAllAsRead, deleteRead, deleteOne } = useNotificationActions(userId, !!user, disabledTypes);

  return {
    data: allNotifications,
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    unreadCount, filteredData, filteredUnreadCount,
    markAsRead, markAllAsRead, deleteRead, deleteOne,
  };
};
