/**
 * مكوّن الرسوم البيانية للوحة التحكم — غلاف Suspense للتحميل الكسول
 */
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardChartsInner = lazy(() => import('./DashboardChartsInner'));

interface DashboardChartsProps {
  monthlyData: Array<{ month: string; income: number; expenses: number }>;
  expenseTypes: Array<{ name: string; value: number }>;
}

const ChartsFallback = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Skeleton className="h-[400px] rounded-lg" />
    <Skeleton className="h-[400px] rounded-lg" />
  </div>
);

const DashboardCharts = (props: DashboardChartsProps) => {
  return (
    <Suspense fallback={<ChartsFallback />}>
      <DashboardChartsInner {...props} />
    </Suspense>
  );
};

export default DashboardCharts;
