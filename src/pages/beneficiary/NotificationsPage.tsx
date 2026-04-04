/**
 * صفحة الإشعارات — المكوّن الرئيسي المجمّع
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing, AlertCircle, RefreshCw } from 'lucide-react';
import { TableSkeleton } from '@/components/common';

import NotificationStatsCards from './notifications/NotificationStatsCards';
import NotificationFiltersBar from './notifications/NotificationFiltersBar';
import NotificationsList from './notifications/NotificationsList';
import { useNotificationsPage } from '@/hooks/page/beneficiary';

const NotificationsPage = () => {
  const {
    isLoading, isError,
    notifications, filtered, unreadCount, readCount, uniqueTypes,
    groupedNotifications,
    categoryFilter, setCategoryFilter, typeFilter, setTypeFilter,
    isSupported, permission,
    markAllAsRead, deleteRead, deleteOne,
    handleRetry, handleClick, handleEnablePush,
  } = useNotificationsPage();

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
