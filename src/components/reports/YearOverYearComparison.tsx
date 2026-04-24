import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { FiscalYear } from '@/types';
import { useYearComparisonState } from '@/hooks/page/admin/reports/useYearComparisonState';
import YoYYearSelectors from '@/components/reports/YoYYearSelectors';
import YoYChangeCards from '@/components/reports/YoYChangeCards';
import YoYComparisonTable from '@/components/reports/YoYComparisonTable';

const YoYChartsSection = lazy(() => import('@/components/reports/YoYChartsSection'));
const YoYSummaryCards = lazy(() => import('@/components/reports/YoYSummaryCards'));

interface YearOverYearComparisonProps {
  fiscalYears: FiscalYear[];
  currentFiscalYearId: string;
}

const YearOverYearComparison = ({ fiscalYears, currentFiscalYearId }: YearOverYearComparisonProps) => {
  const ctx = useYearComparisonState({ fiscalYears, currentFiscalYearId });

  if (fiscalYears.length < 2) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          يجب وجود سنتين ماليتين على الأقل لإجراء المقارنة
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <YoYYearSelectors
        fiscalYears={fiscalYears}
        year1Id={ctx.year1Id}
        year2Id={ctx.year2Id}
        onYear1Change={ctx.setYear1Id}
        onYear2Change={ctx.setYear2Id}
        onExportPDF={ctx.handleExportPDF}
      />

      <YoYChangeCards
        year1Label={ctx.year1Label}
        year2Label={ctx.year2Label}
        yearTotals={ctx.yearTotals}
        incomeChange={ctx.incomeChange}
        expenseChange={ctx.expenseChange}
        netChange={ctx.netChange}
      />

      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <YoYSummaryCards
          year1={ctx.viewYear1}
          year2={ctx.viewYear2}
          year1Label={ctx.year1Label}
          year2Label={ctx.year2Label}
          isLoading={ctx.summariesLoading}
        />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <YoYChartsSection
          comparisonData={ctx.comparisonData}
          year1Label={ctx.year1Label}
          year2Label={ctx.year2Label}
          expensesByType1={ctx.expensesByType1}
          expensesByType2={ctx.expensesByType2}
        />
      </Suspense>

      <YoYComparisonTable
        comparisonData={ctx.comparisonData}
        year1Label={ctx.year1Label}
        year2Label={ctx.year2Label}
        yearTotals={ctx.yearTotals}
      />
    </div>
  );
};

export default YearOverYearComparison;
