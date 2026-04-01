/**
 * بطاقات ملخص الأداء الشهري
 */
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fmt } from '@/utils/format';
import type { MonthlyRow } from '@/hooks/reports/useMonthlyPerformanceData';

interface Props {
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  bestMonth: MonthlyRow | null;
  worstMonth: MonthlyRow | null;
}

const MonthlyPerformanceSummaryCards = ({ avgMonthlyIncome, avgMonthlyExpenses, bestMonth, worstMonth }: Props) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <p className="text-[11px] sm:text-xs text-muted-foreground">متوسط الدخل الشهري</p>
        <p className="text-base sm:text-xl font-bold text-success">{fmt(Math.round(avgMonthlyIncome))} ر.س</p>
      </CardContent>
    </Card>
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <p className="text-[11px] sm:text-xs text-muted-foreground">متوسط المصروفات الشهرية</p>
        <p className="text-base sm:text-xl font-bold text-destructive">{fmt(Math.round(avgMonthlyExpenses))} ر.س</p>
      </CardContent>
    </Card>
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <p className="text-[11px] sm:text-xs text-muted-foreground">أفضل شهر (صافي)</p>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-success" />
          <p className="text-base sm:text-xl font-bold">{bestMonth?.label}</p>
        </div>
        <p className="text-xs text-success">{fmt(bestMonth?.net ?? 0)} ر.س</p>
      </CardContent>
    </Card>
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <p className="text-[11px] sm:text-xs text-muted-foreground">أضعف شهر (صافي)</p>
        <div className="flex items-center gap-1">
          <TrendingDown className="w-4 h-4 text-destructive" />
          <p className="text-base sm:text-xl font-bold">{worstMonth?.label}</p>
        </div>
        <p className="text-xs text-destructive">{fmt(worstMonth?.net ?? 0)} ر.س</p>
      </CardContent>
    </Card>
  </div>
);

export default MonthlyPerformanceSummaryCards;
