import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellRing, CheckCheck, Mail, Wallet, Info, AlertTriangle, Filter, Trash2, BellOff, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  info: { label: 'معلومات', icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  payment: { label: 'مالي', icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  message: { label: 'رسالة', icon: Mail, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  warning: { label: 'تنبيه', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
};

const NotificationsPage = () => {
  const { data: notifications = [], markAsRead, markAllAsRead, deleteRead, deleteOne, unreadCount } = useNotifications();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const navigate = useNavigate();

  const filtered = typeFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === typeFilter);

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
  const groupedNotifications = filtered.reduce((groups, n) => {
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
  }, {} as Record<string, typeof notifications>);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl md:text-2xl font-bold">سجل الإشعارات</h1>
              <p className="text-xs text-muted-foreground">
                {notifications.length} إشعار • {unreadCount} غير مقروء
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Push Notifications Toggle */}
            {isSupported && permission !== 'granted' && (
              <Button variant="outline" size="sm" onClick={handleEnablePush} className="gap-1.5">
                <BellRing className="w-4 h-4" />
                <span className="hidden sm:inline">تفعيل الإشعارات المنبثقة</span>
                <span className="sm:hidden">تفعيل</span>
              </Button>
            )}
            {isSupported && permission === 'granted' && (
              <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-800">
                <BellRing className="w-3 h-3" />
                الإشعارات المنبثقة مفعّلة
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{notifications.length}</p>
              <p className="text-xs text-muted-foreground">الإجمالي</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">غير مقروء</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{readCount}</p>
              <p className="text-xs text-muted-foreground">مقروء</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{uniqueTypes.length}</p>
              <p className="text-xs text-muted-foreground">أنواع</p>
            </CardContent>
          </Card>
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
                {uniqueTypes.map((t) => {
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

        {/* Notifications List - Grouped by Date */}
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
                          {/* Type Icon */}
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', config.bg)}>
                            <Icon className={cn('w-5 h-5', config.color)} />
                          </div>
                          
                          {/* Content */}
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
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.color)}>
                                {config.label}
                              </Badge>
                            </div>
                          </div>

                          {/* Delete button */}
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
