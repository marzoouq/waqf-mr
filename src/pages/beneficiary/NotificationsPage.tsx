import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, CheckCheck, Mail, Wallet, Info, AlertTriangle, Filter, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  info: { label: 'معلومات', icon: Info, color: 'bg-blue-500/10 text-blue-600' },
  payment: { label: 'مالي', icon: Wallet, color: 'bg-emerald-500/10 text-emerald-600' },
  message: { label: 'رسالة', icon: Mail, color: 'bg-violet-500/10 text-violet-600' },
  warning: { label: 'تنبيه', icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-600' },
};

const NotificationsPage = () => {
  const { data: notifications = [], markAsRead, markAllAsRead, deleteRead, deleteOne, unreadCount } = useNotifications();
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

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">سجل الإشعارات</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount} غير مقروء</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {uniqueTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {typeConfig[t]?.label || t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()} className="gap-1.5">
                <CheckCheck className="w-4 h-4" />
                قراءة الكل
              </Button>
            )}
            {readCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                    حذف المقروءة
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              {filtered.length} إشعار{typeFilter !== 'all' ? ` (${typeConfig[typeFilter]?.label || typeFilter})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((n) => {
                  const config = typeConfig[n.type] || typeConfig.info;
                  const Icon = config.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        'w-full text-right p-4 hover:bg-muted/50 transition-colors flex items-start gap-3',
                        !n.is_read && 'bg-primary/5'
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', config.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn('text-sm font-medium', !n.is_read && 'font-bold')}>{n.title}</p>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
