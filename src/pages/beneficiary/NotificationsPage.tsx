/**
 * صفحة الإشعارات — المكوّن الرئيسي المجمّع
 */
import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/data/notifications/useNotifications';
import { usePushNotifications } from '@/hooks/data/notifications/usePushNotifications';
import { Bell, BellRing, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/common';

import { NOTIFICATION_CATEGORIES } from './notifications/notificationConstants';
import NotificationStatsCards from './notifications/NotificationStatsCards';
import NotificationFiltersBar from './notifications/NotificationFiltersBar';
import NotificationsList from './notifications/NotificationsList';

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }), [queryClient]);
  const { data: _allNotifications = [], filteredData: notifications = [], markAsRead, markAllAsRead, deleteRead, deleteOne, filteredUnreadCount: unreadCount, isLoading, isError } = useNotifications();
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

  const handleClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleEnablePush = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      toast.success('تم تفعيل الإشعارات المنبثقة بنجاح');
    } else if (result === 'denied') {
      toast.error('تم رفض الإشعارات المنبثقة. يمكنك تغييرها من إعدادات المتصفح');
    }
  };

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

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل الإشعارات</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 space-y-5">
          <TableSkeleton rows={6} cols={3} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5">
        <PageHeaderCard
          title="سجل الإشعارات"
          description={`${notifications.length} إشعار • ${unreadCount} غير مقروء`}
          icon={Bell}
          actions={
            <>
              {isSupported && permission !== 'granted' && (
                <Button variant="outline" size="sm" onClick={handleEnablePush} className="gap-1.5">
                  <BellRing className="w-4 h-4" />
                  <span className="hidden sm:inline">تفعيل الإشعارات المنبثقة</span>
                  <span className="sm:hidden">تفعيل</span>
                </Button>
              )}
              {isSupported && permission === 'granted' && (
                <Badge variant="outline" className="gap-1 text-xs text-success border-success/30 bg-success/10">
                  <BellRing className="w-3 h-3" />
                  الإشعارات المنبثقة مفعّلة
                </Badge>
              )}
            </>
          }
        />

        <NotificationStatsCards
          total={notifications.length}
          unreadCount={unreadCount}
          readCount={readCount}
          typesCount={uniqueTypes.length}
        />

        <NotificationFiltersBar
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          uniqueTypes={uniqueTypes}
          unreadCount={unreadCount}
          readCount={readCount}
          notifications={notifications}
          onMarkAllRead={() => markAllAsRead.mutate()}
          onDeleteRead={() => deleteRead.mutate()}
        />

        <NotificationsList
          groupedNotifications={groupedNotifications}
          isEmpty={filtered.length === 0}
          onClickNotification={handleClick}
          onDelete={(id) => deleteOne.mutate(id)}
        />
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
