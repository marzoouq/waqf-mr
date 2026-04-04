/**
 * لوحة تحكم مخصصة للواقف
 * تعرض ملخص شامل للوقف: العقارات، العقود، الأداء المالي، مؤشرات KPI
 */
import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/layout';
import { NoPublishedYearsNotice, ExportMenu, DashboardSkeleton, DeferredRender } from '@/components/common';
import WaqifWelcomeCard from '@/components/waqif/WaqifWelcomeCard';
import WaqifFinancialSection from '@/components/waqif/WaqifFinancialSection';
import WaqifOverviewStats from '@/components/waqif/WaqifOverviewStats';
import WaqifQuickLinks from '@/components/waqif/WaqifQuickLinks';
import { useWaqifDashboardPage } from '@/hooks/page/beneficiary/useWaqifDashboardPage';

const LazyWaqifCharts = lazy(() => import('@/components/waqif/WaqifChartsInner'));

const WaqifDashboard = () => {
  const {
    isLoading, noPublishedYears,
    displayName, greeting, GreetingIcon, hijriDate, gregorianDate, timeStr,
    overviewStats, kpis,
    fiscalYear, totalIncome, totalExpenses, availableAmount,
    activeContracts, expiredContracts,
    contractualRevenue, collectionSummary,
    monthlyData, expenseData,
  } = useWaqifDashboardPage();

  if (isLoading) return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-3 sm:p-6 space-y-4">
          <WaqifWelcomeCard displayName={displayName} greeting={greeting} GreetingIcon={GreetingIcon} hijriDate={hijriDate} gregorianDate={gregorianDate} timeStr={timeStr} />
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <WaqifWelcomeCard displayName={displayName} greeting={greeting} GreetingIcon={GreetingIcon} hijriDate={hijriDate} gregorianDate={gregorianDate} timeStr={timeStr} />

        <div className="flex items-center justify-end gap-2">
          <ExportMenu hidePdf />
        </div>

        <WaqifOverviewStats stats={overviewStats} />

        <DeferredRender delay={200}>
          <WaqifFinancialSection
            kpis={kpis}
            fiscalYearLabel={fiscalYear?.label || ''}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            availableAmount={availableAmount}
            isFiscalYearActive={fiscalYear?.status === 'active'}
            activeContractsCount={activeContracts.length}
            expiredContractsCount={expiredContracts.length}
            contractualRevenue={contractualRevenue}
            collectionSummary={collectionSummary}
          />
        </DeferredRender>

        <DeferredRender delay={400}>
          {(monthlyData.length > 0 || expenseData.length > 0) && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><BarChart3 className="w-5 h-5" /> الرسوم البيانية</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<Skeleton className="h-[280px] w-full rounded-lg" />}>
                  <LazyWaqifCharts monthlyData={monthlyData} expenseData={expenseData} />
                </Suspense>
              </CardContent>
            </Card>
          )}
        </DeferredRender>

        <DeferredRender delay={600}>
          <WaqifQuickLinks />
        </DeferredRender>
      </div>
    </DashboardLayout>
  );
};

export default WaqifDashboard;
