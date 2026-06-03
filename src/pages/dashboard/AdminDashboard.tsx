/**
 * AdminDashboard — UI خالصة بعد استخراج المنطق إلى useAdminDashboardPage (A2)
 */
import { lazy } from 'react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import DashboardLazySection from '@/components/dashboard/DashboardLazySection';
import { Button } from '@/components/ui/button';
import FiscalYearWidget from '@/components/dashboard/widgets/FiscalYearWidget';
import DashboardAlerts from '@/components/dashboard/widgets/DashboardAlerts';
import QuickActionsCard from '@/components/dashboard/widgets/QuickActionsCard';
import RecentContractsCard from '@/components/dashboard/widgets/RecentContractsCard';
import DashboardStatsGrid from '@/components/dashboard/kpi/DashboardStatsGrid';
import DashboardKpiPanel from '@/components/dashboard/kpi/DashboardKpiPanel';
import CollectionSummaryCard from '@/components/dashboard/kpi/CollectionSummaryCard';
import YearComparisonCard from '@/components/dashboard/kpi/YearComparisonCard';
import AccountantDashboardView from '@/components/dashboard/views/AccountantDashboardView';
import { Printer, Gauge } from 'lucide-react';
import { PageHeaderCard, DashboardLayout } from '@/components/layout';
import type { FiscalYear } from '@/types';
import ChartSkeleton from '@/components/common/ChartSkeleton';
import { useAdminDashboardPage } from '@/hooks/page/admin/dashboard/useAdminDashboardPage';

// Lazy-load heavy below-the-fold components
const DashboardCharts = lazy(() => import('@/components/dashboard/charts/DashboardCharts'));
const CollectionHeatmap = lazy(() => import('@/components/dashboard/charts/CollectionHeatmap'));
const PendingActionsTable = lazy(() => import('@/components/dashboard/widgets/PendingActionsTable'));
const PagePerformanceCard = lazy(() => import('@/components/dashboard/views/PagePerformanceCard'));

const AdminDashboard = () => {
  const ctx = useAdminDashboardPage();

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {ctx.isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            حدث خطأ أثناء تحميل بيانات اللوحة. يُرجى المحاولة مرة أخرى.
          </div>
        )}

        <PageHeaderCard
          title="لوحة التحكم"
          icon={Gauge}
          description={ctx.greetingText}
          actions={
            <Button variant="outline" onClick={ctx.print} className="gap-2">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
          }
        />

        <DashboardAlerts
          usingFallbackPct={ctx.usingFallbackPct}
          expiringContractsCount={ctx.expiringContractsCount}
          orphanedContractsCount={ctx.orphanedContractsCount}
          pendingAdvancesCount={ctx.pendingAdvancesCount}
          collectionRate={ctx.collectionSummary.percentage}
          expenseRatio={ctx.expenseRatio}
          canApproveAdvances={ctx.role === 'admin'}
          canConfigureRatios={ctx.role === 'admin'}
        />

        <DashboardStatsGrid stats={ctx.stats} isLoading={ctx.isLoading} />
        <DashboardKpiPanel kpis={ctx.kpis} isLoading={ctx.isLoading} />

        <FiscalYearWidget
          fiscalYear={ctx.fiscalYear}
          totalIncome={ctx.totalIncome}
          contractualRevenue={ctx.contractualRevenue}
        />

        <QuickActionsCard role={ctx.role} />

        {ctx.isAccountant && (
          <DashboardLazySection minHeight={200}>
            <AccountantDashboardView
              metrics={ctx.accountantMetrics}
              isLoading={ctx.isLoading || ctx.secondaryIsLoading}
            />
          </DashboardLazySection>
        )}

        <ErrorBoundary>
          <CollectionSummaryCard
            collectionSummary={ctx.collectionSummary}
            collectionColor={ctx.collectionColor}
          />
        </ErrorBoundary>

        <DashboardLazySection minHeight={160} printHidden>
          <CollectionHeatmap
            paymentInvoices={ctx.heatmapInvoices}
            fiscalYearStart={ctx.heatmapBounds.start}
            fiscalYearEnd={ctx.heatmapBounds.end}
          />
        </DashboardLazySection>

        {/* PendingActions / Charts / YearComparison — حصرية للناظر (تكشف بيانات حساسة) */}
        {ctx.role === 'admin' && (
          <>
            <DashboardLazySection minHeight={200} printHidden>
              <PendingActionsTable
                advanceRequests={ctx.pendingAdvances}
                paymentInvoices={ctx.heatmapInvoices}
              />
            </DashboardLazySection>

            <DashboardLazySection minHeight={300} printHidden fallback={<ChartSkeleton />}>
              <DashboardCharts monthlyData={ctx.monthlyData} expenseTypes={ctx.expenseTypes} />
            </DashboardLazySection>

            <DashboardLazySection minHeight={200}>
              <YearComparisonCard
                allFiscalYears={ctx.allFiscalYears as FiscalYear[]}
                fiscalYearId={ctx.fiscalYearId}
              />
            </DashboardLazySection>
          </>
        )}

        {ctx.showPerformanceCard && (
          <DashboardLazySection minHeight={200} printHidden>
            <PagePerformanceCard />
          </DashboardLazySection>
        )}

        <DashboardLazySection minHeight={200}>
          <RecentContractsCard
            contracts={ctx.recentContracts}
            isLoading={ctx.secondaryIsLoading}
            isError={ctx.isRecentContractsError}
          />
        </DashboardLazySection>

      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
