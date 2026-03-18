import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, AlertTriangle, Info, FileText, DollarSign, X, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  contract: FileText,
  payment: DollarSign,
};

const typeColors: Record<string, string> = {
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
  contract: 'bg-primary/10 text-primary',
  payment: 'bg-destructive/10 text-destructive',
};

const NotificationBell = () => {
  const { data: allNotifications, filteredData: notifications, filteredUnreadCount: unreadCount, markAsRead, markAllAsRead, deleteOne, deleteRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const readCount = allNotifications?.filter((n) => n.is_read).length || 0;

  const handleNotifClick = (notif: { id: string; is_read: boolean; link?: string | null }) => {
    if (!notif.is_read) markAsRead.mutate(notif.id);
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-sidebar-foreground hover:bg-sidebar-accent/50" aria-label="الإشعارات">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -left-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 max-w-[calc(100vw-2rem)] p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-display font-bold text-sm">الإشعارات</h3>
          <div className="flex items-center gap-1">
            {readCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1 text-destructive hover:text-destructive"
                onClick={() => deleteRead.mutate()}
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف المقروءة
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => markAllAsRead.mutate()}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                قراءة الكل
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-80">
          {(!notifications || notifications.length === 0) ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              لا توجد إشعارات
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => {
                const Icon = typeIcons[notif.type] || Info;
                const colorClass = typeColors[notif.type] || typeColors.info;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={cn(
                      'w-full text-right p-3 hover:bg-muted/50 transition-colors flex gap-3 group relative',
                      !notif.is_read && 'bg-accent/30',
                      notif.link && 'cursor-pointer'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', colorClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{notif.title}</p>
                        {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ar })}
                      </p>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteOne.mutate(notif.id); }}
                      className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-muted hover:bg-destructive/20 hover:text-destructive"
                      title="حذف"
                      aria-label="حذف الإشعار"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
