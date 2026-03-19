import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellRing, CheckCheck, Mail, Wallet, Info, AlertTriangle, Filter, Trash2, BellOff, X, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import PageHeaderCard from '@/components/PageHeaderCard';

// تصنيفات الإشعارات (مالية / نظام / عقود / عام)
const NOTIFICATION_CATEGORIES: { id: string; label: string; types: string[] }[] = [
  { id: 'all', label: 'الكل', types: [] },
  { id: 'financial', label: 'مالية', types: ['payment', 'distribution', 'success'] },
  { id: 'contracts', label: 'عقود', types: ['contract', 'warning'] },
  { id: 'system', label: 'نظام', types: ['system', 'error', 'info'] },
  { id: 'messages', label: 'رسائل', types: ['message'] },
];

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; category: string }> = {
  info: { label: 'معلومات', icon: Info, color: 'text-info', bg: 'bg-info/10', category: 'system' },
  payment: { label: 'مالي', icon: Wallet, color: 'text-success', bg: 'bg-success/10', category: 'financial' },
  message: { label: 'رسالة', icon: Mail, color: 'text-accent-foreground', bg: 'bg-accent/10', category: 'messages' },
  warning: { label: 'تنبيه', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', category: 'contracts' },
  contract: { label: 'عقود', icon: FileText, color: 'text-info', bg: 'bg-info/10', category: 'contracts' },
  system: { label: 'نظام', icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted/30', category: 'system' },
  distribution: { label: 'توزيع', icon: Wallet, color: 'text-primary', bg: 'bg-primary/10', category: 'financial' },
  success: { label: 'نجاح', icon: CheckCheck, color: 'text-success', bg: 'bg-success/10', category: 'financial' },
  error: { label: 'خطأ', icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', category: 'system' },
};

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries(), [queryClient]);
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

  // Group notifications by date
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
    groups[key].push(n);
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold">{notifications.length}</p>
              <p className="text-xs text-muted-foreground">الإجمالي</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">غير مقروء</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold text-success">{readCount}</p>
              <p className="text-xs text-muted-foreground">مقروء</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold">{uniqueTypes.length}</p>
              <p className="text-xs text-muted-foreground">أنواع</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {NOTIFICATION_CATEGORIES.map((cat) => {
            const count = cat.id === 'all'
              ? notifications.length
              : notifications.filter(n => cat.types.includes(n.type)).length;
            return (
              <Button
                key={cat.id}
                variant={categoryFilter === cat.id ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5 flex-shrink-0"
                onClick={() => {
                  setCategoryFilter(cat.id);
                  setTypeFilter('all');
                }}
              >
                {cat.label}
                {count > 0 && (
                  <Badge variant={categoryFilter === cat.id ? 'secondary' : 'outline'} className="text-xs px-1.5 min-w-[1.25rem] h-5">
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(categoryFilter === 'all' ? uniqueTypes : uniqueTypes.filter(t => {
                  const cat = NOTIFICATION_CATEGORIES.find(c => c.id === categoryFilter);
                  return cat?.types.includes(t);
                })).map((t) => {
                  const config = typeConfig[t] || typeConfig.info;
                  return (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <config.icon className={cn('w-3 h-3', config.color)} />
                        {config.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()} className="gap-1.5">
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">قراءة الكل</span>
              </Button>
            )}
            {readCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">حذف المقروءة</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف الإشعارات المقروءة</AlertDialogTitle>
                    <AlertDialogDescription>سيتم حذف {readCount} إشعار مقروء نهائياً. هل أنت متأكد؟</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteRead.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <BellOff className="w-16 h-16 mx-auto mb-4 opacity-15" />
              <p className="text-lg font-medium">لا توجد إشعارات</p>
              <p className="text-sm mt-1">ستظهر هنا عند وصول إشعارات جديدة</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedNotifications).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{dateLabel}</span>
                  <div className="flex-1 h-px bg-border" />
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                <Card className="overflow-hidden">
                  <div className="divide-y divide-border">
                    {items.map((n) => {
                      const config = typeConfig[n.type] || typeConfig.info;
                      const Icon = config.icon;
                      return (
                        <div
                          key={n.id}
                          className={cn(
                            'group relative flex items-start gap-3 p-4 transition-all cursor-pointer',
                            'hover:bg-muted/50',
                            !n.is_read && 'bg-primary/[0.03]'
                          )}
                          onClick={() => handleClick(n)}
                        >
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', config.bg)}>
                            <Icon className={cn('w-5 h-5', config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn('text-sm', !n.is_read ? 'font-bold' : 'font-medium')}>
                                {n.title}
                              </p>
                              {!n.is_read && (
                                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-muted-foreground/60">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                              </span>
                              <Badge variant="outline" className={cn('text-xs px-1.5 py-0', config.color)}>
                                {config.label}
                              </Badge>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteOne.mutate(n.id);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>حذف</TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
