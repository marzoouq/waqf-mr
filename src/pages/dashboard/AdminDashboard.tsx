
import { lazy, Suspense, useMemo } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useDashboardRealtime } from '@/hooks/data/useDashboardRealtime';
import { Button } from '@/components/ui/button';
import FiscalYearWidget from '@/components/dashboard/FiscalYearWidget';
import { Printer, Gauge, BarChart3, ArrowUpDown, Activity } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import DashboardLayout from '@/components/dashboard-layout';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import DeferredRender from '@/components/DeferredRender';
import CollapsibleSection from '@/components/dashboard/CollapsibleSection';
import DashboardAlerts from '@/components/dashboard/DashboardAlerts';
import DashboardStatsGrid from '@/components/dashboard/DashboardStatsGrid';
import DashboardKpiPanel from '@/components/dashboard/DashboardKpiPanel';
import CollectionSummaryCard from '@/components/dashboard/CollectionSummaryCard';
import RecentContractsCard from '@/components/dashboard/RecentContractsCard';
import QuickActionsCard from '@/components/dashboard/QuickActionsCard';
import { useAdminDashboardData } from '@/hooks/page/useAdminDashboardData';

// Lazy-load heavy below-the-fold components
const DashboardChartsInner = lazy(() => import('@/components/dashboard/DashboardChartsInner'));
const CollectionHeatmap = lazy(() => import('@/components/dashboard/CollectionHeatmap'));
const PendingActionsTable = lazy(() => import('@/components/dashboard/PendingActionsTable'));
const PagePerformanceCard = lazy(() => import('@/components/dashboard/PagePerformanceCard'));
const YearOverYearComparison = lazy(() => import('@/components/reports/YearOverYearComparison'));

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Skeleton className="h-[300px] w-full rounded-lg" />
    <Skeleton className="h-[300px] w-full rounded-lg" />
  </div>
);

const AdminDashboard = () => {
  const { role, user } = useAuth();
  const { fiscalYearId, fiscalYear, isSpecificYear } = useFiscalYear();

  // ═══ Realtime ═══
  useDashboardRealtime('admin-dashboard-realtime', ['income', 'expenses', 'accounts', 'payment_invoices']);

  // ── اسم العرض ──
  const userDisplayName = useMemo(() =>
    user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || (role === 'accountant' ? 'المحاسب' : 'ناظر الوقف'),
    [user, role],
  );

  // ═══ البيانات والحسابات المجمّعة ═══
  const {
    isLoading, usingFallbackPct, expiringContracts, orphanedContracts,
    pendingAdvancesCount, collectionSummary, collectionColor,
    stats, kpis, totalIncome, contractualRevenue, contracts,
    paymentInvoices, advanceRequests, allFiscalYears,
    monthlyData, expenseTypes, greetingText,
  } = useAdminDashboardData({
    fiscalYearId, fiscalYear, isSpecificYear, role, userDisplayName,
  });

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
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
          expiringContracts={expiringContracts}
          orphanedContracts={orphanedContracts}
          pendingAdvancesCount={pendingAdvancesCount}
          collectionRate={collectionSummary.percentage}
        />

        <DashboardStatsGrid stats={stats} isLoading={isLoading} />
        <DashboardKpiPanel kpis={kpis} isLoading={isLoading} />

        <FiscalYearWidget
          fiscalYear={fiscalYear}
          totalIncome={totalIncome}
          contractualRevenue={contractualRevenue}
        />

        <QuickActionsCard role={role} />

        <ErrorBoundary>
          <CollectionSummaryCard collectionSummary={collectionSummary} collectionColor={collectionColor} />
        </ErrorBoundary>

        <DeferredRender delay={1500}>
          <div className="print:hidden">
            <ErrorBoundary>
              <Suspense fallback={<Skeleton className="h-[160px] w-full rounded-lg" />}>
                <CollectionHeatmap paymentInvoices={paymentInvoices} fiscalYearStart={fiscalYear?.start_date} fiscalYearEnd={fiscalYear?.end_date} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </DeferredRender>

        <DeferredRender delay={2000}>
          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
              <PendingActionsTable advanceRequests={advanceRequests} paymentInvoices={paymentInvoices} />
            </Suspense>
          </ErrorBoundary>
        </DeferredRender>

        <DeferredRender delay={2500}>
          <div className="print:hidden">
            <ErrorBoundary>
              <CollapsibleSection title="الرسوم البيانية" icon={BarChart3} printHidden>
                <Suspense fallback={<ChartSkeleton />}>
                  <DashboardChartsInner monthlyData={monthlyData} expenseTypes={expenseTypes} />
                </Suspense>
              </CollapsibleSection>
            </ErrorBoundary>
          </div>
        </DeferredRender>

        {allFiscalYears.length >= 2 && (
          <DeferredRender delay={3000}>
            <ErrorBoundary>
              <CollapsibleSection title="مقارنة بين السنوات المالية" icon={ArrowUpDown}>
                <Suspense fallback={<ChartSkeleton />}>
                  <YearOverYearComparison
                    fiscalYears={allFiscalYears}
                    currentFiscalYearId={fiscalYearId === 'all' ? (allFiscalYears[0]?.id || '') : fiscalYearId}
                  />
                </Suspense>
              </CollapsibleSection>
            </ErrorBoundary>
          </DeferredRender>
        )}

        {role === 'admin' && (
          <DeferredRender delay={3500}>
            <div className="print:hidden">
              <ErrorBoundary>
                <CollapsibleSection title="مراقبة أداء الصفحات" icon={Activity} printHidden>
                  <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
                    <PagePerformanceCard />
                  </Suspense>
                </CollapsibleSection>
              </ErrorBoundary>
            </div>
          </DeferredRender>
        )}

        <ErrorBoundary>
          <RecentContractsCard contracts={contracts} isLoading={isLoading} />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
