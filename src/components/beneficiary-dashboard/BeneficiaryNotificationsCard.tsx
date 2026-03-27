import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface BeneficiaryNotificationsCardProps {
  notifications: Notification[];
  unreadCount: number;
}

const BeneficiaryNotificationsCard = ({ notifications, unreadCount }: BeneficiaryNotificationsCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Bell className="w-5 h-5" />
          آخر الإشعارات
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[11px] px-1.5">{unreadCount}</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/beneficiary/notifications')}>عرض الكل</Button>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">لا توجد إشعارات جديدة</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{n.title}</p>
                    {!n.is_read && <Badge variant="secondary" className="text-[11px] px-1.5 py-0">جديد</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{n.message}</p>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleDateString('ar-SA')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BeneficiaryNotificationsCard;
