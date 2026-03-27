
import { EXPIRING_SOON_DAYS } from '@/constants';
import { lazy, Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ErrorBoundary';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardRealtime } from '@/hooks/ui/useDashboardRealtime';
import { safeNumber } from '@/utils/safeNumber';
import { computeMonthlyData } from '@/utils/dashboardComputations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProperties } from '@/hooks/data/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/useContracts';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useYoYComparison } from '@/hooks/financial/useYoYComparison';
import FiscalYearWidget from '@/components/dashboard/FiscalYearWidget';
import { FileText, TrendingUp, TrendingDown, Users, Wallet, Printer, Gauge, ArrowUpDown, Landmark, GitBranch } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAllUnits } from '@/hooks/data/useUnits';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { usePaymentInvoices } from '@/hooks/data/usePaymentInvoices';
import { useFiscalYears } from '@/hooks/financial/useFiscalYears';
import { useContractAllocations } from '@/hooks/financial/useContractAllocations';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdvanceRequests } from '@/hooks/financial/useAdvanceRequests';

// مكونات فرعية مستخرجة
import DashboardAlerts from '@/components/dashboard/DashboardAlerts';
import DashboardStatsGrid from '@/components/dashboard/DashboardStatsGrid';
import DashboardKpiPanel from '@/components/dashboard/DashboardKpiPanel';
import CollectionSummaryCard from '@/components/dashboard/CollectionSummaryCard';
import RecentContractsCard from '@/components/dashboard/RecentContractsCard';

// هوك الإحصائيات المستخرج
import { useAdminDashboardStats } from '@/hooks/page/useAdminDashboardStats';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';

// Lazy-load heavy below-the-fold components
const YearOverYearComparison = lazy(() => import('@/components/reports/YearOverYearComparison'));
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
  const { fiscalYearId, fiscalYear } = useFiscalYear();

  // ═══ Realtime: تحديث فوري للبطاقات عند تغيير البيانات المالية ═══
  useDashboardRealtime('admin-dashboard-realtime', ['income', 'expenses', 'accounts', 'payment_invoices']);
  const { data: allFiscalYears = [], isLoading: fyListLoading } = useFiscalYears();
  const { data: advanceRequests = [] } = useAdvanceRequests(fiscalYearId !== 'all' ? fiscalYearId : undefined);

  // ── حساب عدد السلف المعلقة مرة واحدة ──
  const pendingAdvancesCount = useMemo(
    () => advanceRequests.filter(r => r.status === 'pending').length,
    [advanceRequests],
  );

  const { data: properties = [], isLoading: propsLoading } = useProperties();
  const { data: contracts = [], isLoading: contractsLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: allUnits = [], isLoading: unitsLoading } = useAllUnits();
  const { data: paymentInvoices = [], isLoading: paymentsLoading } = usePaymentInvoices(fiscalYearId || 'all');
  const allocFyId = (fiscalYearId !== 'all' && !!fiscalYearId) ? fiscalYearId : undefined;
  const { data: contractAllocations = [] } = useContractAllocations(allocFyId);

  const { data: orphanedContracts = [] } = useQuery({
    queryKey: ['contracts', 'orphaned'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number')
        .is('fiscal_year_id', null)
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const {
    income, expenses, beneficiaries,
    totalIncome, totalExpenses,
    adminShare, waqifShare, waqfRevenue,
    netAfterExpenses, netAfterZakat, availableAmount,
    zakatAmount: _zakatAmount,
    distributionsAmount,
    usingFallbackPct,
    isLoading: finLoading,
  } = useFinancialSummary(fiscalYearId, fiscalYear?.label, {
    fiscalYearStatus: fiscalYear?.status,
  });

  const yoy = useYoYComparison(fiscalYearId === 'all' ? undefined : fiscalYearId);

  const isLoading = propsLoading || contractsLoading || unitsLoading || paymentsLoading || finLoading || fyListLoading;

  const { isSpecificYear } = useFiscalYear();
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
    availableAmount, adminShare, waqifShare, waqfRevenue,
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
        {(role === 'accountant' || role === 'admin') && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                إجراءات سريعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {role === 'accountant' ? (
                  <>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/income">
                        <TrendingUp className="w-5 h-5 text-success" />
                        <span className="text-xs">تسجيل دخل</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/expenses">
                        <TrendingDown className="w-5 h-5 text-destructive" />
                        <span className="text-xs">تسجيل مصروف</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/accounts">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-xs">الحسابات الختامية</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/invoices">
                        <FileText className="w-5 h-5 text-secondary" />
                        <span className="text-xs">إدارة الفواتير</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/chart-of-accounts">
                        <GitBranch className="w-5 h-5 text-accent-foreground" />
                        <span className="text-xs">الشجرة المحاسبية</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/comparison">
                        <ArrowUpDown className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs">المقارنة التاريخية</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/annual-report">
                        <Printer className="w-5 h-5 text-primary" />
                        <span className="text-xs">التقرير السنوي</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/reports">
                        <Gauge className="w-5 h-5 text-secondary" />
                        <span className="text-xs">التقارير المالية</span>
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/contracts">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-xs">مراجعة العقود</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/beneficiaries">
                        <Users className="w-5 h-5 text-success" />
                        <span className="text-xs">إدارة المستفيدين</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/reports">
                        <Gauge className="w-5 h-5 text-warning" />
                        <span className="text-xs">التقارير</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                      <Link to="/dashboard/settings">
                        <Landmark className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs">الإعدادات</span>
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ملخص التحصيل */}
        <ErrorBoundary>
          <CollectionSummaryCard collectionSummary={collectionSummary} collectionColor={collectionColor} />
        </ErrorBoundary>

        {/* خريطة حرارية — تُخفى عند الطباعة */}
        <div className="print:hidden">
          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="h-[160px] w-full rounded-lg" />}>
              <CollectionHeatmap paymentInvoices={paymentInvoices} fiscalYearStart={fiscalYear?.start_date} fiscalYearEnd={fiscalYear?.end_date} />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* جدول الإجراءات المعلقة */}
        <ErrorBoundary>
          <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
            <PendingActionsTable advanceRequests={advanceRequests} paymentInvoices={paymentInvoices} />
          </Suspense>
        </ErrorBoundary>

        {/* الرسوم البيانية — تُخفى عند الطباعة */}
        <div className="print:hidden">
          <ErrorBoundary>
            <Suspense fallback={<ChartSkeleton />}>
              <DashboardCharts monthlyData={monthlyData} expenseTypes={expenseTypes} />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* مقارنة بين السنوات */}
        {allFiscalYears.length >= 2 ? (
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
                    currentFiscalYearId={fiscalYearId === 'all' ? (allFiscalYears[0]?.id || '') : fiscalYearId}
                  />
                </CardContent>
              </Card>
            </Suspense>
          </ErrorBoundary>
        ) : (
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
        )}

        {/* مراقبة أداء الصفحات — للناظر فقط، تُخفى عند الطباعة */}
        {role === 'admin' && (
          <div className="print:hidden">
            <ErrorBoundary>
              <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
                <PagePerformanceCard />
              </Suspense>
            </ErrorBoundary>
          </div>
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
