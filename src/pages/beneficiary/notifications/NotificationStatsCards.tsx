/**
 * بطاقات إحصائيات الإشعارات
 */
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  total: number;
  unreadCount: number;
  readCount: number;
  typesCount: number;
}

const NotificationStatsCards = ({ total, unreadCount, readCount, typesCount }: Props) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <Card className="border-none shadow-sm">
      <CardContent className="p-3 text-center">
        <p className="text-xl sm:text-2xl font-bold">{total}</p>
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
        <p className="text-xl sm:text-2xl font-bold">{typesCount}</p>
        <p className="text-xs text-muted-foreground">أنواع</p>
      </CardContent>
    </Card>
  </div>
);

export default NotificationStatsCards;
