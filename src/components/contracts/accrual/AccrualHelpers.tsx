/**
 * مكوّنات وثوابت مساعدة لجدول الاستحقاقات الشهري
 */
import { useState } from 'react';
import { Contract } from '@/types/database';
import { fmtInt } from '@/utils/format/format';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export interface MonthCell {
  label: string;
  month: number;
  year: number;
}

export interface CellData {
  amount: number;
  status: CellStatus;
}

export type CellStatus = 'paid' | 'overdue' | 'pending' | 'empty';

export const fmtNum = (v: number) => fmtInt(v);

/** بناء شبكة 12 شهر ديناميكية تبدأ من شهر بداية السنة المالية */
export const buildFiscalMonthGrid = (fiscalYear?: { start_date: string; end_date: string } | null): MonthCell[] => {
  const startDate = fiscalYear?.start_date ? new Date(fiscalYear.start_date) : new Date();
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();

  return Array.from({ length: 12 }, (_, i) => {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    return { label: MONTH_NAMES[m]!, month: m, year: y };
  });
};

/** تحديد لون الخلية حسب حالة الفاتورة */
export const getCellClasses = (status: CellStatus): string => {
  switch (status) {
    case 'paid': return 'bg-success/10 text-success font-medium';
    case 'overdue': return 'bg-destructive/10 text-destructive font-medium';
    case 'pending': return 'text-foreground font-medium';
    case 'empty': return 'text-muted-foreground/40';
  }
};

/** بطاقة عقد واحد للجوال */
export const MobileAccrualCard = ({ contract, cells, total, grid }: {
  contract: Contract;
  cells: CellData[];
  total: number;
  grid: MonthCell[];
}) => {
  const [open, setOpen] = useState(false);
  const activeMonths = cells.filter(c => c.amount > 0).length;

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
                  <p className="text-xs text-muted-foreground">{activeMonths} دفعة</p>
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
                <div key={i} className={`text-center rounded p-1.5 ${cells[i]!.amount > 0 ? getCellClasses(cells[i]!.status).replace('font-medium', '') : 'bg-muted/30'}`}>
                  <p className="text-xs text-muted-foreground">{cell.label}</p>
                  <p className={`text-xs tabular-nums font-medium ${cells[i]!.amount > 0 ? getCellClasses(cells[i]!.status) : 'text-muted-foreground/40'}`}>
                    {cells[i]!.amount > 0 ? fmtNum(cells[i]!.amount) : '—'}
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
