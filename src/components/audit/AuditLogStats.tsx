/**
 * بطاقات إحصائيات سجل المراجعة — العمليات اليومية والإجمالية
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CalendarDays, Clock } from 'lucide-react';

interface AuditLogStatsProps {
  totalCount: number;
  todayCount: number;
  lastOperationDate: string | null;
}

const AuditLogStats = ({ totalCount, todayCount, lastOperationDate }: AuditLogStatsProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" />إجمالي العمليات
        </CardTitle>
      </CardHeader>
      <CardContent><p className="text-2xl font-bold">{totalCount}</p></CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />عمليات اليوم
        </CardTitle>
      </CardHeader>
      <CardContent><p className="text-2xl font-bold">{todayCount}</p></CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          <Clock className="w-4 h-4" />آخر عملية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium">
          {lastOperationDate ? new Date(lastOperationDate).toLocaleString('ar-SA') : '—'}
        </p>
      </CardContent>
    </Card>
  </div>
);

export default AuditLogStats;
