/**
 * AdminDashboard — UI خالصة بعد استخراج المنطق إلى useAdminDashboardPage (A2)
 */
import { lazy, Suspense } from 'react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import DeferredRender from '@/components/common/DeferredRender';
import ViewportRender from '@/components/common/ViewportRender';
import { Button } from '@/components/ui/button';
import {
  FiscalYearWidget, DashboardAlerts, DashboardStatsGrid, DashboardKpiPanel,
  CollectionSummaryCard, RecentContractsCard, QuickActionsCard, YearComparisonCard,
  AccountantDashboardView,
} from '@/components/dashboard';
import { Printer, Gauge } from 'lucide-react';
import { PageHeaderCard, DashboardLayout } from '@/components/layout';
import type { FiscalYear } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
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
          role={ctx.role}
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
          <ErrorBoundary>
            <AccountantDashboardView
              metrics={ctx.accountantMetrics}
              isLoading={ctx.isLoading || ctx.secondaryIsLoading}
            />
          </ErrorBoundary>
        )}

        <ErrorBoundary>
          <CollectionSummaryCard
            collectionSummary={ctx.collectionSummary}
            collectionColor={ctx.collectionColor}
          />
        </ErrorBoundary>

        <ViewportRender minHeight={160}>
          <div className="print:hidden">
            <ErrorBoundary>
              <Suspense fallback={<Skeleton className="h-[160px] w-full rounded-lg" />}>
                <CollectionHeatmap
                  paymentInvoices={ctx.heatmapInvoices}
                  fiscalYearStart={ctx.fy?.start_date}
                  fiscalYearEnd={ctx.fy?.end_date}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        </ViewportRender>

        <DeferredRender delay={100}>
          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
              <PendingActionsTable
                advanceRequests={ctx.pendingAdvances}
                paymentInvoices={ctx.heatmapInvoices}
              />
            </Suspense>
          </ErrorBoundary>
        </DeferredRender>

        <ViewportRender minHeight={300}>
          <div className="print:hidden">
            <ErrorBoundary>
              <Suspense fallback={<ChartSkeleton />}>
                <DashboardCharts monthlyData={ctx.monthlyData} expenseTypes={ctx.expenseTypes} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </ViewportRender>

        <ViewportRender minHeight={200}>
          <YearComparisonCard
            allFiscalYears={ctx.allFiscalYears as FiscalYear[]}
            fiscalYearId={ctx.fiscalYearId}
          />
        </ViewportRender>

        {ctx.role === 'admin' && (
          <ViewportRender minHeight={200}>
            <div className="print:hidden">
              <ErrorBoundary>
                <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
                  <PagePerformanceCard />
                </Suspense>
              </ErrorBoundary>
            </div>
          </ViewportRender>
        )}

        <ViewportRender minHeight={200}>
          <ErrorBoundary>
            <RecentContractsCard
              contracts={ctx.recentContracts}
              isLoading={ctx.secondaryIsLoading}
            />
          </ErrorBoundary>
        </ViewportRender>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
