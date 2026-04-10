
import { lazy, Suspense, useCallback } from 'react';
import { usePrint } from '@/hooks/ui/usePrint';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import DeferredRender from '@/components/common/DeferredRender';
import ViewportRender from '@/components/common/ViewportRender';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { Button } from '@/components/ui/button';
import { FiscalYearWidget, DashboardAlerts, DashboardStatsGrid, DashboardKpiPanel, CollectionSummaryCard, RecentContractsCard, QuickActionsCard, YearComparisonCard } from '@/components/dashboard';
import AccountantDashboardView from '@/components/dashboard/AccountantDashboardView';
import { Printer, Gauge } from 'lucide-react';
import { PageHeaderCard, DashboardLayout } from '@/components/layout';
import type { FiscalYear } from '@/types/database';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import ChartSkeleton from '@/components/common/ChartSkeleton';

// هوك البيانات المدمج
import { useDashboardSummary, useDashboardSecondary } from '@/hooks/data/financial/useDashboardSummary';
// هوك الحسابات المستخرج
import { useAdminDashboardData } from '@/hooks/page/admin/dashboard/useAdminDashboardData';
import { useAccountantDashboardData } from '@/hooks/page/admin/dashboard/useAccountantDashboardData';

// Lazy-load heavy below-the-fold components
const DashboardCharts = lazy(() => import('@/components/dashboard/DashboardCharts'));
const CollectionHeatmap = lazy(() => import('@/components/dashboard/CollectionHeatmap'));
const PendingActionsTable = lazy(() => import('@/components/dashboard/PendingActionsTable'));
const PagePerformanceCard = lazy(() => import('@/components/dashboard/PagePerformanceCard'));


const AdminDashboard = () => {
  const { role, user } = useAuth();
  const { fiscalYearId, fiscalYear, isSpecificYear } = useFiscalYear();

  useDashboardRealtime('admin-dashboard-realtime', ['income', 'expenses', 'accounts', 'payment_invoices', 'messages'], true, [['dashboard-summary'], ['dashboard-heatmap'], ['dashboard-recent-contracts'], ['unread-messages-count']]);

  const summary = useDashboardSummary(fiscalYearId, fiscalYear?.label);
  const isLoading = summary.isLoading;

  // هوك ثانوي — يجلب heatmap و recent_contracts بعد تحميل KPIs
  const secondary = useDashboardSecondary(fiscalYearId, !summary.isLoading);

  const {
    pendingAdvancesCount, totalIncome, contractualRevenue,
    usingFallbackPct, expiringContractsCount, orphanedContractsCount,
    expenseRatio, stats, kpis, collectionSummary, collectionColor,
    monthlyData, expenseTypes, greetingText,
    allFiscalYears, fiscalYear: fy, isError,
  } = useAdminDashboardData({
    user, role, fiscalYearId, fiscalYear: fiscalYear ?? undefined, isSpecificYear, summary,
  });

  // هوك بيانات المحاسب المخصصة
  const isAccountant = role === 'accountant';
  const accountantMetrics = useAccountantDashboardData({
    aggregated: summary.aggregated,
    heatmapInvoices: secondary.heatmapInvoices,
  });

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            حدث خطأ أثناء تحميل بيانات اللوحة. يُرجى المحاولة مرة أخرى.
          </div>
        )}

        <PageHeaderCard
          title="لوحة التحكم"
          icon={Gauge}
          description={greetingText}
          actions={
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
          }
        />

        <DashboardAlerts
          usingFallbackPct={usingFallbackPct}
          expiringContractsCount={expiringContractsCount}
          orphanedContractsCount={orphanedContractsCount}
          pendingAdvancesCount={pendingAdvancesCount}
          collectionRate={collectionSummary.percentage}
          expenseRatio={expenseRatio}
          role={role}
        />

        <DashboardStatsGrid stats={stats} isLoading={isLoading} />
        <DashboardKpiPanel kpis={kpis} isLoading={isLoading} />

        <FiscalYearWidget
          fiscalYear={fiscalYear}
          totalIncome={totalIncome}
          contractualRevenue={contractualRevenue}
        />

        <QuickActionsCard role={role} />

        {/* عرض مخصص للمحاسب — بطاقات تشغيلية */}
        {isAccountant && (
          <ErrorBoundary>
            <AccountantDashboardView metrics={accountantMetrics} isLoading={isLoading || secondary.isLoading} />
          </ErrorBoundary>
        )}

        <ErrorBoundary>
          <CollectionSummaryCard collectionSummary={collectionSummary} collectionColor={collectionColor} />
        </ErrorBoundary>

        <ViewportRender minHeight={160}>
          <div className="print:hidden">
            <ErrorBoundary>
              <Suspense fallback={<Skeleton className="h-[160px] w-full rounded-lg" />}>
                <CollectionHeatmap paymentInvoices={secondary.heatmapInvoices} fiscalYearStart={fy?.start_date} fiscalYearEnd={fy?.end_date} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </ViewportRender>

        <DeferredRender delay={100}>
          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
              <PendingActionsTable advanceRequests={summary.pendingAdvances} paymentInvoices={secondary.heatmapInvoices} />
            </Suspense>
          </ErrorBoundary>
        </DeferredRender>

        <ViewportRender minHeight={300}>
          <div className="print:hidden">
            <ErrorBoundary>
              <Suspense fallback={<ChartSkeleton />}>
                <DashboardCharts monthlyData={monthlyData} expenseTypes={expenseTypes} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </ViewportRender>

        <ViewportRender minHeight={200}>
          <YearComparisonCard allFiscalYears={allFiscalYears as FiscalYear[]} fiscalYearId={fiscalYearId} />
        </ViewportRender>

        {role === 'admin' && (
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
            <RecentContractsCard contracts={secondary.recentContracts} isLoading={secondary.isLoading} />
          </ErrorBoundary>
        </ViewportRender>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
