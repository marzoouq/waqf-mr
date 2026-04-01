
import { EXPIRING_SOON_DAYS } from '@/constants';
import { lazy, Suspense, useMemo } from 'react';
import YearComparisonSection from '@/components/dashboard/YearComparisonSection';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useDashboardRealtime } from '@/hooks/data/useDashboardRealtime';
import { safeNumber } from '@/utils/safeNumber';
import { computeMonthlyData } from '@/utils/dashboardComputations';

import { Button } from '@/components/ui/button';
import { useComputedFinancials } from '@/hooks/financial/useComputedFinancials';
import FiscalYearWidget from '@/components/dashboard/FiscalYearWidget';
import { Printer, Gauge } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import DashboardLayout from '@/components/DashboardLayout';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import DeferredRender from '@/components/DeferredRender';

// هوك البيانات المدمج — طلب واحد بدلاً من ~10
import { useDashboardSummary } from '@/hooks/page/useDashboardSummary';

// مكونات فرعية مستخرجة
import DashboardAlerts from '@/components/dashboard/DashboardAlerts';
import DashboardStatsGrid from '@/components/dashboard/DashboardStatsGrid';
import DashboardKpiPanel from '@/components/dashboard/DashboardKpiPanel';
import CollectionSummaryCard from '@/components/dashboard/CollectionSummaryCard';
import RecentContractsCard from '@/components/dashboard/RecentContractsCard';
import QuickActionsCard from '@/components/dashboard/QuickActionsCard';

// هوك الإحصائيات المستخرج
import { useAdminDashboardStats } from '@/hooks/page/useAdminDashboardStats';

// Lazy-load heavy below-the-fold components

const DashboardCharts = lazy(() => import('@/components/dashboard/DashboardCharts'));
const CollectionHeatmap = lazy(() => import('@/components/dashboard/CollectionHeatmap'));
const PendingActionsTable = lazy(() => import('@/components/dashboard/PendingActionsTable'));
const PagePerformanceCard = lazy(() => import('@/components/dashboard/PagePerformanceCard'));

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Skeleton className="h-[300px] w-full rounded-lg" />
    <Skeleton className="h-[300px] w-full rounded-lg" />
  </div>
);

const AdminDashboard = () => {
  const { role, user } = useAuth();
  const { fiscalYearId, fiscalYear, isSpecificYear } = useFiscalYear();

  // ═══ Realtime: تحديث فوري للبطاقات عند تغيير البيانات المالية ═══
  useDashboardRealtime('admin-dashboard-realtime', ['income', 'expenses', 'accounts', 'payment_invoices']);

  // ═══ طلب واحد مدمج بدلاً من ~10 طلبات منفصلة ═══
  const {
    properties, contracts, allUnits, paymentInvoices,
    contractAllocations, advanceRequests, orphanedContracts,
    income, expenses, accounts, beneficiaries, settings,
    allFiscalYears, yoy,
    isLoading: summaryLoading,
  } = useDashboardSummary(fiscalYearId, fiscalYear?.label);

  // ── حساب عدد السلف المعلقة ──
  const pendingAdvancesCount = useMemo(
    () => advanceRequests.filter(r => r.status === 'pending').length,
    [advanceRequests],
  );

  // ── الحسابات المالية (من البيانات المجلوبة) ──
  const computedAccounts = useMemo(
    () => accounts.map(a => ({ ...a, fiscal_year_id: a.fiscal_year_id ?? '' })),
    [accounts],
  );
  const {
    totalIncome, totalExpenses, adminShare, waqifShare, waqfRevenue,
    netAfterExpenses, netAfterZakat, availableAmount,
    zakatAmount: _zakatAmount, distributionsAmount, usingFallbackPct,
  } = useComputedFinancials({
    income, expenses, accounts: computedAccounts, settings,
    fiscalYearLabel: fiscalYear?.label,
    fiscalYearId,
    fiscalYearStatus: fiscalYear?.status,
  });

  const isLoading = summaryLoading;

  const relevantContracts = useMemo(
    () => isSpecificYear ? contracts : contracts.filter(c => c.status === 'active'),
    [contracts, isSpecificYear]
  );
  const activeContractsCount = relevantContracts.length;
  const contractualRevenue = useMemo(() => {
    if (isSpecificYear && contractAllocations.length > 0) {
      const allocMap = new Map<string, number>();
      contractAllocations.forEach(a => {
        allocMap.set(a.contract_id, (allocMap.get(a.contract_id) ?? 0) + safeNumber(a.allocated_amount));
      });
      return relevantContracts.reduce((sum, c) => sum + (allocMap.get(c.id) ?? 0), 0);
    }
    return relevantContracts.reduce((sum, c) => sum + safeNumber(c.rent_amount), 0);
  }, [relevantContracts, contractAllocations, isSpecificYear]);

  const isYearActive = fiscalYear?.status === 'active';
  const sharesNote = isYearActive ? ' *تقديري' : '';

  const expiringContracts = useMemo(() =>
    contracts.filter(c => {
      const daysLeft = (new Date(c.end_date).getTime() - Date.now()) / 86_400_000;
      return c.status === 'active' && daysLeft >= 0 && daysLeft <= EXPIRING_SOON_DAYS;
    }),
    [contracts]
  );

  // ── استخدام هوك الإحصائيات المستخرج ──
  const { stats, kpis, collectionSummary, collectionColor } = useAdminDashboardStats({
    properties, activeContractsCount, contractualRevenue,
    totalIncome, totalExpenses, netAfterExpenses, netAfterZakat,
    availableAmount, adminShare: adminShare ?? 0, waqifShare: waqifShare ?? 0, waqfRevenue: waqfRevenue ?? 0,
    distributionsAmount, beneficiaries, isYearActive, sharesNote,
    yoy, contracts, paymentInvoices, allUnits, isSpecificYear,
  });

  const monthlyData = useMemo(() => computeMonthlyData(income, expenses), [income, expenses]);

  const expenseTypes = useMemo(() => {
    const types: Record<string, number> = {};
    expenses.forEach(item => {
      const type = item.expense_type || 'أخرى';
      types[type] = (types[type] || 0) + safeNumber(item.amount);
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // ── التحية المحسوبة مرة واحدة ──
  const greetingText = useMemo(() => {
    const displayName = user?.user_metadata?.full_name
      || user?.email?.split('@')[0]
      || (role === 'accountant' ? 'المحاسب' : 'ناظر الوقف');
    const base = role === 'accountant'
      ? `مرحباً بك، ${displayName} — يمكنك إدارة الحسابات والعمليات المالية`
      : `مرحباً بك، ${displayName}`;
    return base + (fiscalYearId === 'all' ? ' — عرض إجمالي جميع السنوات' : fiscalYear ? ` — ${fiscalYear.label}` : '');
  }, [user, role, fiscalYearId, fiscalYear]);

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

        {/* التنبيهات */}
        <DashboardAlerts
          usingFallbackPct={usingFallbackPct}
          expiringContracts={expiringContracts}
          orphanedContracts={orphanedContracts}
          pendingAdvancesCount={pendingAdvancesCount}
          collectionRate={collectionSummary.percentage}
        />

        {/* بطاقات الإحصائيات */}
        <DashboardStatsGrid stats={stats} isLoading={isLoading} />

        {/* مؤشرات الأداء */}
        <DashboardKpiPanel kpis={kpis} isLoading={isLoading} />

        {/* ويدجت السنة المالية */}
        <FiscalYearWidget
          fiscalYear={fiscalYear}
          totalIncome={totalIncome}
          contractualRevenue={contractualRevenue}
        />

        {/* إجراءات سريعة */}
        <QuickActionsCard role={role} />

        {/* ملخص التحصيل */}
        <ErrorBoundary>
          <CollectionSummaryCard collectionSummary={collectionSummary} collectionColor={collectionColor} />
        </ErrorBoundary>

        {/* خريطة حرارية — تُخفى عند الطباعة */}
        <DeferredRender delay={1500}>
          <div className="print:hidden">
            <ErrorBoundary>
              <Suspense fallback={<Skeleton className="h-[160px] w-full rounded-lg" />}>
                <CollectionHeatmap paymentInvoices={paymentInvoices} fiscalYearStart={fiscalYear?.start_date} fiscalYearEnd={fiscalYear?.end_date} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </DeferredRender>

        {/* جدول الإجراءات المعلقة */}
        <DeferredRender delay={2000}>
          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
              <PendingActionsTable advanceRequests={advanceRequests} paymentInvoices={paymentInvoices} />
            </Suspense>
          </ErrorBoundary>
        </DeferredRender>

        {/* الرسوم البيانية — تُخفى عند الطباعة */}
        <DeferredRender delay={2500}>
          <div className="print:hidden">
            <ErrorBoundary>
              <Suspense fallback={<ChartSkeleton />}>
                <DashboardCharts monthlyData={monthlyData} expenseTypes={expenseTypes} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </DeferredRender>

        {/* مقارنة بين السنوات */}
        <DeferredRender delay={3000}>
          <YearComparisonSection allFiscalYears={allFiscalYears} fiscalYearId={fiscalYearId} />
        </DeferredRender>

        {/* مراقبة أداء الصفحات — للناظر فقط، تُخفى عند الطباعة */}
        {role === 'admin' && (
          <DeferredRender delay={3500}>
            <div className="print:hidden">
              <ErrorBoundary>
                <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
                  <PagePerformanceCard />
                </Suspense>
              </ErrorBoundary>
            </div>
          </DeferredRender>
        )}

        {/* آخر العقود */}
        <ErrorBoundary>
          <RecentContractsCard contracts={contracts} isLoading={isLoading} />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
