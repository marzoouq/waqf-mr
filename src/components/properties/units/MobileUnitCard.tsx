/** بطاقة وحدة على الجوال */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2 } from 'lucide-react';
import { statusColor } from './constants';
import { getPaymentStatus, getMonthlyRent, type TenantInfo } from './helpers';
import { fmt, fmtInt } from '@/utils/format';
import type { UnitRow } from '@/hooks/useUnits';

interface MobileUnitCardProps {
  unit: UnitRow;
  tenant: TenantInfo | null;
  paidMonths: number;
  onEdit: (unit: UnitRow) => void;
  onDelete: (unit: UnitRow) => void;
}

const MobileUnitCard = ({ unit, tenant, paidMonths, onEdit, onDelete }: MobileUnitCardProps) => {
  const isComplete = paidMonths >= 12;
  const progressPercent = (paidMonths / 12) * 100;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">وحدة {unit.unit_number}</span>
              <Badge variant={statusColor(unit.status)}>{unit.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{unit.unit_type}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(unit)} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => onDelete(unit)} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
        {tenant ? (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-[11px] text-muted-foreground">المستأجر</p>
                <p className="text-sm font-medium">{tenant.name}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">الإيجار السنوي</p>
                <p className="text-sm font-medium">{fmt(tenant.rent_amount)} ريال</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">الإيجار الشهري</p>
                <p className="text-sm font-medium">{fmtInt(getMonthlyRent(tenant))} ريال</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">بداية العقد</p>
                <p className="text-sm font-medium">{tenant.start_date}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">نهاية العقد</p>
                <p className="text-sm font-medium">{tenant.end_date}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className={`min-w-[3rem] text-center font-semibold ${isComplete ? 'text-success' : 'text-destructive'}`}>{paidMonths}/12</span>
              <Progress value={progressPercent} className={`flex-1 h-2 ${isComplete ? '[&>div]:bg-success' : paidMonths >= 6 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`} />
            </div>
            <p className="text-[10px] text-muted-foreground">يتم التحصيل عبر الفواتير</p>
            {tenant.status === 'active' && (() => {
              const ps = getPaymentStatus(tenant, paidMonths);
              return ps.status === 'ontime'
                ? <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20 w-fit">منتظم</Badge>
                : <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20 w-fit">متأخر ({ps.overdueCount} دفعة)</Badge>;
            })()}
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">لا يوجد مستأجر</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileUnitCard;
