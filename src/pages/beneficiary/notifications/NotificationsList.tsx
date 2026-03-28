/**
 * قائمة الإشعارات المجمّعة حسب التاريخ
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BellOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { typeConfig } from './notificationConstants';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

interface Props {
  groupedNotifications: Record<string, Notification[]>;
  isEmpty: boolean;
  onClickNotification: (n: Notification) => void;
  onDelete: (id: string) => void;
}

const NotificationsList = ({ groupedNotifications, isEmpty, onClickNotification, onDelete }: Props) => {
  if (isEmpty) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <BellOff className="w-16 h-16 mx-auto mb-4 opacity-15" />
          <p className="text-lg font-medium">لا توجد إشعارات</p>
          <p className="text-sm mt-1">ستظهر هنا عند وصول إشعارات جديدة</p>
        </CardContent>
      </Card>
    );
  }

  return (
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
                const config = typeConfig[n.type] ?? typeConfig.info!;
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'group relative flex items-start gap-3 p-4 transition-all cursor-pointer',
                      'hover:bg-muted/50',
                      !n.is_read && 'bg-primary/3'
                    )}
                    onClick={() => onClickNotification(n)}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5', config.bg)}>
                      <Icon className={cn('w-5 h-5', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm', !n.is_read ? 'font-bold' : 'font-medium')}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0" />
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
                          className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
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
  );
};

export default NotificationsList;
