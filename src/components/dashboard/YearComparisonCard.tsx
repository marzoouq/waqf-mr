/**
 * بطاقة مقارنة بين السنوات المالية — تُستخدم في لوحة التحكم
 */
import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import type { FiscalYear } from '@/types/database';
import { isFyAll } from '@/constants/fiscalYearIds';

const YearOverYearComparison = lazy(() => import('@/components/reports/YearOverYearComparison'));

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Skeleton className="h-[300px] w-full rounded-lg" />
    <Skeleton className="h-[300px] w-full rounded-lg" />
  </div>
);

interface YearComparisonCardProps {
  allFiscalYears: FiscalYear[];
  fiscalYearId: string;
}

const YearComparisonCard = ({ allFiscalYears, fiscalYearId }: YearComparisonCardProps) => {
  if (allFiscalYears.length >= 2) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<ChartSkeleton />}>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5" />
                مقارنة بين السنوات المالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <YearOverYearComparison
                fiscalYears={allFiscalYears}
                currentFiscalYearId={isFyAll(fiscalYearId) ? (allFiscalYears[0]?.id || '') : fiscalYearId}
              />
            </CardContent>
          </Card>
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="w-5 h-5" />
          مقارنة بين السنوات المالية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground py-8">
          ستتوفر المقارنة بين السنوات عند إضافة سنة مالية ثانية على الأقل.
        </p>
      </CardContent>
    </Card>
  );
};

export default YearComparisonCard;
