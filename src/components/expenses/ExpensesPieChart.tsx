/**
 * E-8: رسم بياني دائري لتوزيع المصروفات حسب النوع.
 */
import { lazy, Suspense, useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { Expense } from '@/types/database';

const LazyPieChart = lazy(() => import('./ExpensePieChartInner'));

interface ExpensesPieChartProps {
  expenses: Expense[];
  isLoading: boolean;
}

const ExpensesPieChart: React.FC<ExpensesPieChartProps> = ({ expenses, isLoading }) => {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      const type = e.expense_type || 'أخرى';
      map.set(type, (map.get(type) || 0) + safeNumber(e.amount));
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  if (isLoading || data.length === 0) {
    if (isLoading) return <Skeleton className="h-[300px] w-full rounded-lg" />;
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="w-5 h-5" />
          توزيع المصروفات حسب النوع
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-[250px] w-full rounded-lg" />}>
          <LazyPieChart data={data} />
        </Suspense>
      </CardContent>
    </Card>
  );
};

export default ExpensesPieChart;
