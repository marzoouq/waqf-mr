/**
 * بطاقات ملخص التدفق النقدي
 */
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { CashFlowTotals } from '@/hooks/reports/useCashFlowData';

interface Props {
  totals: CashFlowTotals;
  fmt: (v: number) => string;
}

const CashFlowSummaryCards = ({ totals, fmt }: Props) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs text-muted-foreground">إجمالي التدفقات الداخلة</p>
        <p className="text-lg font-bold text-success">{fmt(totals.totalIncome)} ر.س</p>
      </CardContent>
    </Card>
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs text-muted-foreground">إجمالي التدفقات الخارجة</p>
        <p className="text-lg font-bold text-destructive">{fmt(totals.totalExpenses)} ر.س</p>
      </CardContent>
    </Card>
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs text-muted-foreground">صافي التدفق النقدي</p>
        <p className={`text-lg font-bold ${totals.totalNet >= 0 ? 'text-success' : 'text-destructive'}`}>
          {fmt(totals.totalNet)} ر.س
        </p>
      </CardContent>
    </Card>
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs text-muted-foreground">أشهر موجبة / سالبة</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1 text-success text-sm font-bold">
            <TrendingUp className="w-3.5 h-3.5" />{totals.positiveMonths}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="flex items-center gap-1 text-destructive text-sm font-bold">
            <TrendingDown className="w-3.5 h-3.5" />{totals.negativeMonths}
          </span>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default CashFlowSummaryCards;
