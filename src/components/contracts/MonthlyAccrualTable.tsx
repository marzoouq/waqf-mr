/**
 * C-1: جدول الاستحقاقات الشهري — يعرض شبكة 12 شهر ديناميكية حسب السنة المالية
 * يحسب المبلغ المستحق لكل شهر بناءً على إجمالي الإيجار / 12
 */
import { useMemo, useState } from 'react';
import { Contract } from '@/types/database';
import { safeNumber } from '@/utils/safeNumber';
import { fmtInt } from '@/utils/format';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MonthlyAccrualTableProps {
  contracts: Contract[];
  isLoading?: boolean;
  fiscalYearId?: string;
  fiscalYear?: { start_date: string; end_date: string; label?: string } | null;
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

interface MonthCell {
  /** اسم الشهر بالعربي */
  label: string;
  /** 0-11 */
  month: number;
  /** السنة الميلادية */
  year: number;
}

/** بناء شبكة 12 شهر ديناميكية تبدأ من شهر بداية السنة المالية */
const buildFiscalMonthGrid = (fiscalYear?: { start_date: string; end_date: string } | null): MonthCell[] => {
  const startDate = fiscalYear?.start_date ? new Date(fiscalYear.start_date) : new Date();
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();

  return Array.from({ length: 12 }, (_, i) => {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    return { label: MONTH_NAMES[m], month: m, year: y };
  });
};

/** حساب المبلغ الشهري المستحق */
const getMonthlyAmount = (contract: Contract): number => {
  return safeNumber(contract.rent_amount) / 12;
};

/** هل الشهر/السنة المحددة ضمن فترة العقد؟ */
const isMonthInContractRange = (cellMonth: number, cellYear: number, start: Date, end: Date): boolean => {
  const monthStart = new Date(cellYear, cellMonth, 1);
  const monthEnd = new Date(cellYear, cellMonth + 1, 0);
  return monthStart <= end && monthEnd >= start;
};

const fmtNum = (v: number) => fmtInt(v);

/** بطاقة عقد واحد للجوال مع تفاصيل الأشهر القابلة للتوسيع */
const MobileAccrualCard = ({ contract, months, total, grid }: { contract: Contract; months: number[]; total: number; grid: MonthCell[] }) => {
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
              {grid.map((cell, i) => (
                <div key={i} className={`text-center rounded p-1.5 ${months[i] > 0 ? 'bg-success/10' : 'bg-muted/30'}`}>
                  <p className="text-xs text-muted-foreground">{cell.label}</p>
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

const MonthlyAccrualTable = ({ contracts, isLoading, fiscalYearId, fiscalYear }: MonthlyAccrualTableProps) => {
  const isSpecificYear = fiscalYearId && fiscalYearId !== 'all';

  const activeContracts = useMemo(
    () => isSpecificYear ? contracts : contracts.filter(c => c.status === 'active'),
    [contracts, isSpecificYear]
  );

  /** شبكة الأشهر الديناميكية حسب السنة المالية */
  const monthGrid = useMemo(() => buildFiscalMonthGrid(fiscalYear), [fiscalYear]);

  /** عنوان الجدول */
  const tableTitle = useMemo(() => {
    if (fiscalYear && 'label' in fiscalYear && fiscalYear.label) return fiscalYear.label;
    if (fiscalYear?.start_date) {
      const sy = new Date(fiscalYear.start_date).getFullYear();
      const ey = new Date(fiscalYear.end_date).getFullYear();
      return sy === ey ? String(sy) : `${sy}-${ey}`;
    }
    return String(new Date().getFullYear());
  }, [fiscalYear]);

  const accrualData = useMemo(() => {
    return activeContracts.map(contract => {
      const monthlyAmount = getMonthlyAmount(contract);
      const start = new Date(contract.start_date);
      const end = new Date(contract.end_date);
      const months = monthGrid.map(cell => {
        return isMonthInContractRange(cell.month, cell.year, start, end) ? monthlyAmount : 0;
      });
      const total = months.reduce((s, v) => s + v, 0);
      return { contract, months, total };
    });
  }, [activeContracts, monthGrid]);

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
          <p className="text-muted-foreground">لا توجد عقود لعرض الاستحقاقات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="w-5 h-5 text-primary" />
          جدول الاستحقاقات الشهري — {tableTitle}
          <Badge variant="secondary" className="mr-2">{activeContracts.length} عقد</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 md:p-0">
        {/* عرض بطاقات الجوال */}
        <div className="md:hidden p-3 space-y-3">
          <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/20">
            <p className="text-xs text-muted-foreground">الإجمالي السنوي</p>
            <p className="text-lg font-bold text-primary tabular-nums">{fmtNum(grandTotal)} ر.س</p>
          </div>
          {accrualData.map(({ contract, months, total }) => (
            <MobileAccrualCard key={contract.id} contract={contract} months={months} total={total} grid={monthGrid} />
          ))}
        </div>

        {/* عرض الجدول للشاشات الكبيرة */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right sticky right-0 bg-muted/50 z-10 min-w-[160px]">العقد / المستأجر</TableHead>
                {monthGrid.map((cell, i) => (
                  <TableHead key={i} className="text-center text-xs min-w-[85px]">{cell.label}</TableHead>
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
