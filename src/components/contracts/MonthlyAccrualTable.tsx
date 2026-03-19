/**
 * C-1: جدول الاستحقاقات الشهري — يعرض شبكة 12 شهر × عقود نشطة
 * يحسب المبلغ المستحق لكل شهر بناءً على نوع الدفع ومبلغ الإيجار
 */
import { useMemo, useState } from 'react';
import { Contract } from '@/types/database';
import { safeNumber } from '@/utils/safeNumber';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MonthlyAccrualTableProps {
  contracts: Contract[];
  isLoading?: boolean;
}

const MONTH_LABELS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

/** حساب المبلغ الشهري المستحق بناءً على نوع الدفع */
const getMonthlyAmount = (contract: Contract): number => {
  const rent = safeNumber(contract.rent_amount);
  return rent / 12;
};

/** هل الشهر ضمن فترة العقد؟ */
const isMonthInRange = (year: number, month: number, start: Date, end: Date): boolean => {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  return monthStart <= end && monthEnd >= start;
};

const fmtNum = (v: number) => fmtInt(v);

/** بطاقة عقد واحد للجوال مع تفاصيل الأشهر القابلة للتوسيع */
const MobileAccrualCard = ({ contract, months, total }: { contract: Contract; months: number[]; total: number }) => {
  const [open, setOpen] = useState(false);
  const activeMonths = months.filter(m => m > 0).length;

  return (
    <Card className="border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-3 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{contract.contract_number}</p>
                <p className="text-xs text-muted-foreground truncate">{contract.tenant_name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-left">
                  <p className="font-bold text-sm text-primary tabular-nums">{fmtNum(total)} ر.س</p>
                  <p className="text-xs text-muted-foreground">{activeMonths} شهر نشط</p>
                </div>
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 border-t pt-2">
            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_LABELS.map((label, i) => (
                <div key={i} className={`text-center rounded p-1.5 ${months[i] > 0 ? 'bg-success/10' : 'bg-muted/30'}`}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-xs tabular-nums font-medium ${months[i] > 0 ? 'text-success' : 'text-muted-foreground/40'}`}>
                    {months[i] > 0 ? fmtNum(months[i]) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const MonthlyAccrualTable = ({ contracts, isLoading }: MonthlyAccrualTableProps) => {
  const activeContracts = useMemo(
    () => contracts.filter(c => c.status === 'active'),
    [contracts]
  );

  const referenceYear = useMemo(() => {
    if (activeContracts.length === 0) return new Date().getFullYear();
    const dates = activeContracts.map(c => new Date(c.start_date).getFullYear());
    return Math.max(...dates);
  }, [activeContracts]);

  const accrualData = useMemo(() => {
    return activeContracts.map(contract => {
      const monthlyAmount = getMonthlyAmount(contract);
      const start = new Date(contract.start_date);
      const end = new Date(contract.end_date);
      const months = MONTH_LABELS.map((_, i) => {
        const inRange = isMonthInRange(referenceYear, i, start, end);
        return inRange ? monthlyAmount : 0;
      });
      const total = months.reduce((s, v) => s + v, 0);
      return { contract, months, total };
    });
  }, [activeContracts, referenceYear]);

  const monthlyTotals = useMemo(() => {
    const totals = new Array(12).fill(0);
    accrualData.forEach(row => {
      row.months.forEach((v, i) => { totals[i] += v; });
    });
    return totals;
  }, [accrualData]);

  const grandTotal = monthlyTotals.reduce((s, v) => s + v, 0);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeContracts.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center">
          <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لا توجد عقود نشطة لعرض الاستحقاقات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="w-5 h-5 text-primary" />
          جدول الاستحقاقات الشهري — {referenceYear}
          <Badge variant="secondary" className="mr-2">{activeContracts.length} عقد</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 md:p-0">
        {/* عرض بطاقات الجوال */}
        <div className="md:hidden p-3 space-y-3">
          {/* ملخص الإجمالي */}
          <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/20">
            <p className="text-xs text-muted-foreground">الإجمالي السنوي</p>
            <p className="text-lg font-bold text-primary tabular-nums">{fmtNum(grandTotal)} ر.س</p>
          </div>
          {accrualData.map(({ contract, months, total }) => (
            <MobileAccrualCard key={contract.id} contract={contract} months={months} total={total} />
          ))}
        </div>

        {/* عرض الجدول للشاشات الكبيرة */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right sticky right-0 bg-muted/50 z-10 min-w-[160px]">العقد / المستأجر</TableHead>
                {MONTH_LABELS.map((label, i) => (
                  <TableHead key={i} className="text-center text-xs min-w-[85px]">{label}</TableHead>
                ))}
                <TableHead className="text-center font-bold min-w-[100px]">الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accrualData.map(({ contract, months, total }) => (
                <TableRow key={contract.id}>
                  <TableCell className="sticky right-0 bg-background z-10">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{contract.contract_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{contract.tenant_name}</p>
                    </div>
                  </TableCell>
                  {months.map((amount, i) => (
                    <TableCell key={i} className={`text-center text-xs tabular-nums ${amount > 0 ? 'text-success font-medium' : 'text-muted-foreground/40'}`}>
                      {amount > 0 ? fmtNum(amount) : '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold text-sm tabular-nums">
                    {fmtNum(total)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                <TableCell className="sticky right-0 bg-primary/5 z-10 text-primary">الإجمالي</TableCell>
                {monthlyTotals.map((total, i) => (
                  <TableCell key={i} className="text-center text-xs tabular-nums text-primary">
                    {total > 0 ? fmtNum(total) : '—'}
                  </TableCell>
                ))}
                <TableCell className="text-center text-primary text-sm tabular-nums">
                  {fmtNum(grandTotal)} ر.س
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyAccrualTable;
