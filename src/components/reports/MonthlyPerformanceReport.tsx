/**
 * تقرير الأداء الشهري — يستخدم مكونات فرعية مستخرجة.
 */
import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMonthlyPerformanceData } from '@/hooks/reports/useMonthlyPerformanceData';
import MonthlyPerformanceSummaryCards from './MonthlyPerformanceSummaryCards';
import MonthlyPerformanceTable from './MonthlyPerformanceTable';

const MonthlyPerformanceChartsInner = lazy(() => import('./MonthlyPerformanceChartsInner'));

interface MonthlyPerformanceReportProps {
  income: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
  fiscalYear?: string;
}

const MonthlyPerformanceReport = ({ income, expenses }: MonthlyPerformanceReportProps) => {
  const { monthlyData, totals, bestMonth, worstMonth, avgMonthlyIncome, avgMonthlyExpenses } =
    useMonthlyPerformanceData({ income, expenses });

  if (monthlyData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          لا توجد بيانات مالية للسنة المالية المحددة
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <MonthlyPerformanceSummaryCards
        avgMonthlyIncome={avgMonthlyIncome}
        avgMonthlyExpenses={avgMonthlyExpenses}
        bestMonth={bestMonth}
        worstMonth={worstMonth}
      />

      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
        <MonthlyPerformanceChartsInner monthlyData={monthlyData} />
      </Suspense>

      <MonthlyPerformanceTable monthlyData={monthlyData} totals={totals} />
    </div>
  );
};

export default MonthlyPerformanceReport;
