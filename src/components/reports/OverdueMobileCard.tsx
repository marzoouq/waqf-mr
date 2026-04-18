/**
 * بطاقة مستأجر متأخر للجوال — مُستخرَجة من OverdueTenantsReport
 */
import { Card, CardContent } from '@/components/ui/card';
import { fmt, fmtDate } from '@/utils/format/format';
import { type OverdueRowData, getSeverityBadge } from './OverdueRow';

interface Props { row: OverdueRowData }

export default function OverdueMobileCard({ row }: Props) {
  return (
    <Card className="border">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">{row.tenantName}</span>
          {getSeverityBadge(row.severity)}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">رقم العقد</span>
            <p dir="ltr" className="font-medium">{row.contractNumber}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">العقار</span>
            <p className="font-medium">{row.propertyNumber}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">فواتير متأخرة</span>
            <p className="font-medium">{row.overdueCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">الأيام</span>
            <p className="font-bold">{row.maxDays} يوم</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">أقدم استحقاق</span>
            <p className="font-medium">{fmtDate(row.oldestDue)}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">إجمالي المتأخر</span>
            <p className="font-medium text-destructive">{fmt(row.totalOverdue)} ر.س</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
