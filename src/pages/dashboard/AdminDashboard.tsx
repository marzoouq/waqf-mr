import { fmtInt } from '@/utils/format';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { lazy, Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ErrorBoundary';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardRealtime } from '@/hooks/ui/useDashboardRealtime';
import { safeNumber } from '@/utils/safeNumber';
import { computeMonthlyData, computeCollectionSummary, computeOccupancy } from '@/utils/dashboardComputations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProperties } from '@/hooks/data/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/useContracts';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useYoYComparison, calcChangePercent } from '@/hooks/financial/useYoYComparison';
import FiscalYearWidget from '@/components/dashboard/FiscalYearWidget';
import { Building2, FileText, TrendingUp, TrendingDown, Users, Wallet, UserCheck, Crown, Printer, Gauge, ArrowUpDown, DollarSign, Landmark, HandCoins, ArrowDownUp, PercentCircle, GitBranch } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAllUnits } from '@/hooks/data/useUnits';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/contexts/AuthContext';
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
import type { StatItem } from '@/components/dashboard/DashboardStatsGrid';
import type { KpiItem } from '@/components/dashboard/DashboardKpiPanel';

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

// T-03: دالة مساعدة موحّدة لألوان KPI
const getKpiColor = (value: number, good: number, warn: number, invert = false) => {
  const isGood = invert ? value <= good : value >= good;
  const isWarn = invert ? value <= warn : value >= warn;
  if (isGood) return { text: 'text-success', bar: '[&>div]:bg-success' };
  if (isWarn) return { text: 'text-warning', bar: '[&>div]:bg-warning' };
  return { text: 'text-destructive', bar: '[&>div]:bg-destructive' };
};

const AdminDashboard = () => {
  const { role, user } = useAuth();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  

  // ═══ Realtime: تحديث فوري للبطاقات عند تغيير البيانات المالية ═══
  useDashboardRealtime('admin-dashboard-realtime', ['income', 'expenses', 'accounts', 'payment_invoices']);
  const { data: allFiscalYears = [], isLoading: fyListLoading } = useFiscalYears();
  const { data: advanceRequests = [] } = useAdvanceRequests(fiscalYearId !== 'all' ? fiscalYearId : undefined);

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
    zakatAmount,
    distributionsAmount,
    usingFallbackPct,
    isLoading: finLoading,
  } = useFinancialSummary(fiscalYearId, fiscalYear?.label, {
    fiscalYearStatus: fiscalYear?.status,
  });

  const yoy = useYoYComparison(fiscalYearId === 'all' ? undefined : fiscalYearId);

  const isLoading = propsLoading || contractsLoading || unitsLoading || paymentsLoading || finLoading || fyListLoading;

  const { isSpecificYear } = useFiscalYear();
  const relevantContracts = isSpecificYear ? contracts : contracts.filter(c => c.status === 'active');
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

  const collectionSummary = useMemo(
    () => computeCollectionSummary(contracts, paymentInvoices),
    [contracts, paymentInvoices]
  );

  const isYearActive = fiscalYear?.status === 'active';
  /** ملاحظة: الحصص تُحسب فقط عند إقفال السنة المالية */
  const sharesNote = isYearActive ? ' *تقديري' : '';

  const collectionColor = useMemo(() => getKpiColor(collectionSummary.percentage, 80, 50), [collectionSummary.percentage]);

  const expiringContracts = useMemo(() =>
    contracts.filter(c => {
      const daysLeft = (new Date(c.end_date).getTime() - Date.now()) / 86_400_000;
      return c.status === 'active' && daysLeft >= 0 && daysLeft <= EXPIRING_SOON_DAYS;
    }),
    [contracts]
  );

  // ── بطاقات الإحصائيات (مع بطاقتي KPI جديدتين) ──
  const stats: StatItem[] = useMemo(() => {
    const incomeChange = yoy.hasPrevYear ? calcChangePercent(totalIncome, yoy.prevTotalIncome) : null;
    const expenseChange = yoy.hasPrevYear ? calcChangePercent(totalExpenses, yoy.prevTotalExpenses) : null;
    const netChange = yoy.hasPrevYear ? calcChangePercent(netAfterExpenses, yoy.prevNetAfterExpenses) : null;

    // KPI: التدفق النقدي الصافي — مباشرة من الحسابات الموحدة
    const netCashFlow = safeNumber(waqfRevenue);

    // KPI: نسبة التوزيع الفعلي — لا معنى لها في السنة النشطة
    const distributable = isYearActive ? 0 : safeNumber(availableAmount);
    const distributionRatio = isYearActive ? 0 : (distributable > 0 ? Math.round((safeNumber(distributionsAmount) / distributable) * 100) : 0);

    return [
      { title: 'إجمالي العقارات', value: properties.length, icon: Building2, color: 'bg-primary', link: '/dashboard/properties' },
      { title: 'العقود النشطة', value: activeContractsCount, icon: FileText, color: 'bg-secondary', link: '/dashboard/contracts' },
      { title: 'الإيرادات التعاقدية', value: `${fmtInt(contractualRevenue)} ر.س`, icon: TrendingUp, color: 'bg-success', link: '/dashboard/contracts' },
      { title: 'إجمالي الدخل الفعلي', value: `${fmtInt(totalIncome)} ر.س`, icon: DollarSign, color: 'bg-primary', link: '/dashboard/income', yoyChange: incomeChange, invertColor: false },
      { title: 'إجمالي المصروفات', value: `${fmtInt(totalExpenses)} ر.س`, icon: TrendingDown, color: 'bg-destructive', link: '/dashboard/expenses', yoyChange: expenseChange, invertColor: true },
      { title: `صافي الريع${sharesNote}`, value: `${fmtInt(netAfterExpenses)} ر.س`, icon: Landmark, color: 'bg-success', link: '/dashboard/accounts', yoyChange: netChange, invertColor: false },
      { title: isYearActive ? `صافي متاح (قبل الحصص)${sharesNote}` : `المتاح للتوزيع`, value: `${fmtInt(Math.max(0, isYearActive ? netAfterZakat : availableAmount))} ر.س`, icon: HandCoins, color: 'bg-primary', link: '/dashboard/accounts' },
      { title: isYearActive ? 'حصة الناظر' : 'حصة الناظر', value: isYearActive ? 'تُحسب عند الإقفال' : `${fmtInt(adminShare)} ر.س`, icon: UserCheck, color: 'bg-accent', link: '/dashboard/accounts' },
      { title: isYearActive ? 'حصة الواقف' : 'حصة الواقف', value: isYearActive ? 'تُحسب عند الإقفال' : `${fmtInt(waqifShare)} ر.س`, icon: Crown, color: 'bg-secondary', link: '/dashboard/accounts' },
      { title: isYearActive ? 'ريع الوقف' : 'ريع الوقف', value: isYearActive ? 'تُحسب عند الإقفال' : `${fmtInt(waqfRevenue)} ر.س`, icon: Wallet, color: 'bg-primary', link: '/dashboard/beneficiaries' },
      { title: 'المستفيدون النشطون', value: beneficiaries.filter(b => (b.share_percentage ?? 0) > 0).length, icon: Users, color: 'bg-muted', link: '/dashboard/beneficiaries' },
      // بطاقتان جديدتان
      { title: `التدفق النقدي الصافي${sharesNote}`, value: isYearActive ? 'يُحسب عند الإقفال' : `${fmtInt(netCashFlow)} ر.س`, icon: ArrowDownUp, color: netCashFlow >= 0 ? 'bg-success' : 'bg-destructive', link: '/dashboard/accounts' },
      { title: 'نسبة التوزيع الفعلي', value: isYearActive ? '—' : `${distributionRatio}%`, icon: PercentCircle, color: 'bg-accent', link: '/dashboard/beneficiaries' },
    ];
  }, [properties.length, activeContractsCount, contractualRevenue, totalIncome, totalExpenses, netAfterExpenses, netAfterZakat, availableAmount, adminShare, waqifShare, waqfRevenue, zakatAmount, distributionsAmount, beneficiaries, isYearActive, sharesNote, yoy]);

  const monthlyData = useMemo(() => computeMonthlyData(income, expenses), [income, expenses]);

  const expenseTypes = useMemo(() => {
    const types: Record<string, number> = {};
    expenses.forEach(item => {
      const type = item.expense_type || 'أخرى';
      types[type] = (types[type] || 0) + safeNumber(item.amount);
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const kpis: KpiItem[] = useMemo(() => {
    const collectionRate = collectionSummary.percentage;
    const { occupancyRate } = computeOccupancy(contracts, allUnits, isSpecificYear);
    const avgRent = activeContractsCount > 0 ? Math.round(contractualRevenue / activeContractsCount) : 0;
    const expenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

    const colColor = getKpiColor(collectionRate, 80, 50);
    const occColor = getKpiColor(occupancyRate, 80, 50);
    const expColor = getKpiColor(expenseRatio, 20, 40, true);

    // حساب YoY للمصروفات
    const prevExpenseRatio = yoy.hasPrevYear && yoy.prevTotalIncome > 0
      ? Math.round((yoy.prevTotalExpenses / yoy.prevTotalIncome) * 100) : null;
    const expenseRatioChange = prevExpenseRatio !== null ? calcChangePercent(expenseRatio, prevExpenseRatio) : null;

    // عند عدم وجود فواتير مستحقة، لا نعرض 0% بل "—"
    const hasInvoicesDue = collectionSummary.total > 0;

    return [
      { label: 'نسبة التحصيل', value: hasInvoicesDue ? collectionRate : 0, suffix: hasInvoicesDue ? '%' : '', color: hasInvoicesDue ? colColor.text : 'text-muted-foreground', progressColor: hasInvoicesDue ? colColor.bar : '' },
      { label: 'معدل الإشغال', value: occupancyRate, suffix: '%', color: occColor.text, progressColor: occColor.bar },
      { label: 'متوسط الإيجار', value: avgRent, suffix: ' ر.س', color: 'text-primary', progressColor: '' },
      { label: expenseRatio > 100 ? 'عجز مالي' : 'نسبة المصروفات', value: expenseRatio, suffix: '%', color: expenseRatio > 100 ? 'text-destructive font-bold' : expColor.text, progressColor: expenseRatio > 100 ? '[&>div]:bg-destructive' : expColor.bar, yoyChange: expenseRatioChange, invertColor: true },
    ];
  }, [collectionSummary, totalIncome, totalExpenses, allUnits, activeContractsCount, contractualRevenue, contracts, isSpecificYear, yoy]);

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <PageHeaderCard
          title="لوحة التحكم"
          icon={Gauge}
          description={
            (() => {
              const displayName = user?.user_metadata?.full_name
                || user?.email?.split('@')[0]
                || (role === 'accountant' ? 'المحاسب' : 'ناظر الوقف');
              const greeting = role === 'accountant'
                ? `مرحباً بك، ${displayName} — يمكنك إدارة الحسابات والعمليات المالية`
                : `مرحباً بك، ${displayName}`;
              return greeting + (fiscalYearId === 'all' ? ' — عرض إجمالي جميع السنوات' : fiscalYear ? ` — ${fiscalYear.label}` : '');
            })()
          }
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
          pendingAdvancesCount={advanceRequests.filter(r => r.status === 'pending').length}
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
          <Card className="shadow-xs">
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
                    <Link to="/dashboard/income">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <TrendingUp className="w-5 h-5 text-success" />
                        <span className="text-xs">تسجيل دخل</span>
                      </Button>
                    </Link>
                    <Link to="/dashboard/expenses">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <TrendingDown className="w-5 h-5 text-destructive" />
                        <span className="text-xs">تسجيل مصروف</span>
                      </Button>
                    </Link>
                    <Link to="/dashboard/accounts">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-xs">الحسابات الختامية</span>
                      </Button>
                    </Link>
                    <Link to="/dashboard/invoices">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <FileText className="w-5 h-5 text-secondary" />
                        <span className="text-xs">إدارة الفواتير</span>
                      </Button>
                    </Link>
                    <Link to="/dashboard/chart-of-accounts">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <GitBranch className="w-5 h-5 text-accent-foreground" />
                        <span className="text-xs">الشجرة المحاسبية</span>
                      </Button>
                    </Link>
                    <Link to="/dashboard/comparison">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <ArrowUpDown className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs">المقارنة التاريخية</span>
                      </Button>
                    </Link>
                    <Link to="/dashboard/annual-report">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <Printer className="w-5 h-5 text-primary" />
                        <span className="text-xs">التقرير السنوي</span>
                      </Button>
                    </Link>
                    <Link to="/dashboard/reports">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <Gauge className="w-5 h-5 text-secondary" />
                        <span className="text-xs">التقارير المالية</span>
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/dashboard/contracts">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-xs">مراجعة العقود</span>
                      </Button>
                    </Link>
                    <Link to="/dashboard/beneficiaries">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <Users className="w-5 h-5 text-success" />
                        <span className="text-xs">إدارة المستفيدين</span>
                      </Button>
                    </Link>
                    <Link to="/dashboard/reports">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <Gauge className="w-5 h-5 text-warning" />
                        <span className="text-xs">التقارير</span>
                      </Button>
                    </Link>
                    <Link to="/dashboard/settings">
                      <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
                        <Landmark className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs">الإعدادات</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ملخص التحصيل */}
        <CollectionSummaryCard collectionSummary={collectionSummary} collectionColor={collectionColor} />

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
              <Card className="shadow-xs">
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
          <Card className="shadow-xs">
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
        <RecentContractsCard contracts={contracts} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
