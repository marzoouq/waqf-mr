/**
 * شريط الفلاتر والإجراءات
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Filter, CheckCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NOTIFICATION_CATEGORIES, typeConfig } from './notificationConstants';

interface Props {
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  uniqueTypes: string[];
  unreadCount: number;
  readCount: number;
  notifications: { type: string }[];
  onMarkAllRead: () => void;
  onDeleteRead: () => void;
}

const NotificationFiltersBar = ({
  categoryFilter, setCategoryFilter,
  typeFilter, setTypeFilter,
  uniqueTypes, unreadCount, readCount,
  notifications, onMarkAllRead, onDeleteRead,
}: Props) => (
  <>
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
            className="gap-1.5 shrink-0"
            onClick={() => { setCategoryFilter(cat.id); setTypeFilter('all'); }}
          >
            {cat.label}
            {count > 0 && (
              <Badge variant={categoryFilter === cat.id ? 'secondary' : 'outline'} className="text-xs px-1.5 min-w-5 h-5">
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
              const config = typeConfig[t] ?? typeConfig.info!;
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
          <Button variant="outline" size="sm" onClick={onMarkAllRead} className="gap-1.5">
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
                <AlertDialogAction onClick={onDeleteRead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  </>
);

export default NotificationFiltersBar;
