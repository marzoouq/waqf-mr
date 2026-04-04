/**
 * هوك صفحة الإشعارات — يستخرج كل المنطق من NotificationsPage
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/data/notifications/useNotifications';
import { usePushNotifications } from '@/hooks/data/notifications/usePushNotifications';
import { useRetryQueries } from '@/hooks/ui/useRetryQueries';
import { NOTIFICATION_CATEGORIES } from '@/pages/beneficiary/notifications/notificationConstants';

export function useNotificationsPage() {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }), [queryClient]);
  const {
    filteredData: notifications = [], markAsRead, markAllAsRead,
    deleteRead, deleteOne, filteredUnreadCount: unreadCount, isLoading, isError,
  } = useNotifications();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const navigate = useNavigate();

  // فلترة بالتصنيف أولاً، ثم بالنوع
  const categoryTypes = categoryFilter === 'all'
    ? null
    : NOTIFICATION_CATEGORIES.find(c => c.id === categoryFilter)?.types ?? null;

  const filtered = notifications.filter((n) => {
    if (categoryTypes && !categoryTypes.includes(n.type)) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });
  const readCount = notifications.filter((n) => n.is_read).length;
  const uniqueTypes = [...new Set(notifications.map((n) => n.type))];

  const handleClick = useCallback((notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  }, [markAsRead, navigate]);

  const handleEnablePush = useCallback(async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      toast.success('تم تفعيل الإشعارات المنبثقة بنجاح');
    } else if (result === 'denied') {
      toast.error('تم رفض الإشعارات المنبثقة. يمكنك تغييرها من إعدادات المتصفح');
    }
  }, [requestPermission]);

  // تجميع الإشعارات حسب التاريخ
  const groupedNotifications = useMemo(() => filtered.reduce((groups, n) => {
    const date = new Date(n.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'اليوم';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'أمس';
    } else {
      key = date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    if (!groups[key]) groups[key] = [];
    groups[key]!.push(n);
    return groups;
  }, {} as Record<string, typeof notifications>), [filtered]);

  return {
    // حالات التحميل والخطأ
    isLoading, isError,
    // بيانات الإشعارات
    notifications, filtered, unreadCount, readCount, uniqueTypes,
    groupedNotifications,
    // بيانات الفلترة
    categoryFilter, setCategoryFilter, typeFilter, setTypeFilter,
    // بيانات الإشعارات المنبثقة
    isSupported, permission,
    // mutations
    markAllAsRead, deleteRead, deleteOne,
    // دوال الإجراءات
    handleRetry, handleClick, handleEnablePush,
  };
}
