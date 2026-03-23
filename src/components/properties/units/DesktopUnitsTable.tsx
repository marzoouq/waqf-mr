/** جدول الوحدات لسطح المكتب */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2 } from 'lucide-react';
import { statusColor } from './constants';
import { getPaymentStatus, getMonthlyRent, getTenantFromContracts, getMonthlyFromContract, type TenantInfo } from './helpers';
import { fmt, fmtInt } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';
import type { UnitRow } from '@/hooks/useUnits';
import type { Contract } from '@/types/database';

interface DesktopUnitsTableProps {
  units: UnitRow[];
  contracts: Contract[];
  wholePropertyContracts: Contract[];
  tenantPayments: Array<{ contract_id: string; paid_months: number }>;
  onEdit: (unit: UnitRow) => void;
  onDelete: (unit: UnitRow) => void;
}

const DesktopUnitsTable = ({ units, contracts, wholePropertyContracts, tenantPayments, onEdit, onDelete }: DesktopUnitsTableProps) => {
  const getPaymentInfo = (contractId: string) => {
    const payment = tenantPayments.find(p => p.contract_id === contractId);
    return payment ? payment.paid_months : 0;
  };

  // حساب الإجماليات
  let totalAnnual = 0;
  let totalMonthly = 0;
  units.forEach(u => {
    const t = getTenantFromContracts(u.id, contracts);
    if (t) {
      totalAnnual += safeNumber(t.rent_amount);
      totalMonthly += getMonthlyRent(t);
    }
  });
  wholePropertyContracts.forEach(wc => {
    totalAnnual += safeNumber(wc.rent_amount);
    totalMonthly += getMonthlyFromContract(wc);
  });

  return (
    <div className="rounded-md border overflow-x-auto hidden md:block">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="text-right">رقم الوحدة</TableHead>
            <TableHead className="text-right">النوع</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right min-w-[120px]">المستأجر</TableHead>
            <TableHead className="text-right">بداية العقد</TableHead>
            <TableHead className="text-right">نهاية العقد</TableHead>
            <TableHead className="text-right">الإيجار الشهري</TableHead>
            <TableHead className="text-right">الإيجار السنوي</TableHead>
            <TableHead className="text-right min-w-[180px]">الدفعات المسددة</TableHead>
            <TableHead className="text-right">حالة التحصيل</TableHead>
            <TableHead className="text-right">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit, idx) => {
            const tenant = getTenantFromContracts(unit.id, contracts);
            const paid = tenant ? getPaymentInfo(tenant.contract_id) : 0;
            const isComplete = paid >= 12;
            const progressPercent = (paid / 12) * 100;
            return (
              <TableRow key={unit.id} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                <TableCell className="font-medium">{unit.unit_number}</TableCell>
                <TableCell>{unit.unit_type}</TableCell>
                <TableCell><Badge variant={statusColor(unit.status)}>{unit.status}</Badge></TableCell>
                <TableCell>
                  {!tenant ? <span className="text-muted-foreground">-</span> : (
                    <span className="whitespace-nowrap">
                      {tenant.name}
                      {tenant.status !== 'active' && (
                        <Badge variant="outline" className="mr-2 text-[11px] px-1.5 py-0 text-destructive border-destructive/30">منتهي</Badge>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell>{tenant?.start_date || <span className="text-muted-foreground">-</span>}</TableCell>
                <TableCell>{tenant?.end_date || <span className="text-muted-foreground">-</span>}</TableCell>
                <TableCell>
                  {!tenant ? <span className="text-muted-foreground">-</span> : (
                    <span className="font-medium">{fmtInt(getMonthlyRent(tenant))} ريال</span>
                  )}
                </TableCell>
                <TableCell>
                  {!tenant ? <span className="text-muted-foreground">-</span> : (
                    <span className="font-medium">{fmt(tenant.rent_amount)} ريال</span>
                  )}
                </TableCell>
                <TableCell>
                  {!tenant ? <span className="text-muted-foreground">-</span> : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`min-w-[3rem] text-center font-semibold ${isComplete ? 'text-success' : 'text-destructive'}`}>{paid}/12</span>
                      </div>
                      <Progress value={progressPercent} className={`h-2 ${isComplete ? '[&>div]:bg-success' : paid >= 6 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`} />
                      <p className="text-[10px] text-muted-foreground">يتم التحصيل عبر الفواتير</p>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {!tenant || tenant.status !== 'active' ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (() => {
                    const ps = getPaymentStatus(tenant, paid);
                    return ps.status === 'ontime'
                      ? <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">منتظم</Badge>
                      : <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">متأخر ({ps.overdueCount} دفعة)</Badge>;
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(unit)} aria-label="تعديل الوحدة"><Edit className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(unit)} aria-label="حذف الوحدة"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-primary/10 font-bold border-t-2">
            <TableCell colSpan={3} className="text-right">
              الإجمالي <Badge variant="outline" className="mr-2 text-[11px]">شامل النشط والمنتهي</Badge>
            </TableCell>
            <TableCell colSpan={3}></TableCell>
            <TableCell>{fmtInt(totalMonthly)} ريال</TableCell>
            <TableCell>{fmt(totalAnnual)} ريال</TableCell>
            <TableCell colSpan={3}></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default DesktopUnitsTable;
