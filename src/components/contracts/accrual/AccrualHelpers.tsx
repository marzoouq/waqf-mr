/**
 * مكوّنات جدول الاستحقاقات الشهري — بطاقة الجوال
 * (الثوابت/الأنواع/الدوال نُقلت إلى accrualUtils.ts لتفعيل Fast Refresh)
 */
import { useState } from 'react';
import { Contract } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fmtNum, getCellClasses, type CellData, type MonthCell } from './accrualUtils';

// إعادة تصدير للحفاظ على التوافق العكسي
export {
  MONTH_NAMES,
  fmtNum,
  buildFiscalMonthGrid,
  getCellClasses,
  type MonthCell,
  type CellData,
  type CellStatus,
} from './accrualUtils';

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
