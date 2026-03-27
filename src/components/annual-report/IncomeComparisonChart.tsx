/**
 * رسم بياني لمقارنة الدخل عبر السنوات المالية — الرسم يُحمَّل كسولاً.
 */
import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIncomeComparison } from '@/hooks/data/useAnnualReport';
import { Loader2, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const IncomeComparisonChartInner = lazy(() => import('./IncomeComparisonChartInner'));

const IncomeComparisonChart: React.FC = () => {
  const { data = [], isLoading } = useIncomeComparison();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          مقارنة الدخل عبر السنوات المالية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-[250px] w-full rounded-lg" />}>
          <IncomeComparisonChartInner data={data} />
        </Suspense>
      </CardContent>
    </Card>
  );
};

export default IncomeComparisonChart;
