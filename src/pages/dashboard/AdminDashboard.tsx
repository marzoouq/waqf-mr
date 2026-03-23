import { fmtInt } from '@/utils/format';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { lazy, Suspense, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeNumber } from '@/utils/safeNumber';
import { computeMonthlyData, computeCollectionSummary, computeOccupancy } from '@/utils/dashboardComputations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProperties } from '@/hooks/useProperties';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useYoYComparison, calcChangePercent } from '@/hooks/useYoYComparison';
import FiscalYearWidget from '@/components/dashboard/FiscalYearWidget';
import { Building2, FileText, TrendingUp, TrendingDown, Users, Wallet, UserCheck, Crown, Printer, Gauge, ArrowUpDown, DollarSign, Landmark, HandCoins, ArrowDownUp, PercentCircle, GitBranch } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAllUnits } from '@/hooks/useUnits';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentInvoices } from '@/hooks/usePaymentInvoices';
import { useFiscalYears } from '@/hooks/useFiscalYears';
import { useContractAllocations } from '@/hooks/useContractAllocations';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdvanceRequests } from '@/hooks/useAdvanceRequests';

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
  const queryClient = useQueryClient();

  // ═══ Realtime: تحديث فوري للبطاقات عند تغيير البيانات المالية ═══
  useEffect(() => {
    const tables = ['income', 'expenses', 'accounts', 'payment_invoices'] as const;
    const channel = supabase.channel('admin-dashboard-realtime');
    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        queryClient.invalidateQueries({ queryKey: [table] });
      });
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
  const { data: allFiscalYears = [], isLoading: fyListLoading } = useFiscalYears();
  const { data: advanceRequests = [] } = useAdvanceRequests(fiscalYearId !== 'all' ? fiscalYearId : undefined);

  const { data: properties = [], isLoading: propsLoading } = useProperties();
  const { data: contracts = [], isLoading: contractsLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: allUnits = [], isLoading: unitsLoading } = useAllUnits();
  const { data: paymentInvoices = [], isLoading: paymentsLoading } = usePaymentInvoices(fiscalYearId || 'all');
  const { data: contractAllocations = [] } = useContractAllocations(isSpecificYear ? fiscalYearId : undefined);

  const { data: orphanedContracts = [] } = useQuery({
    queryKey: ['contracts', 'orphaned'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number')
        .is('fiscal_year_id', null)
        .limit(50);
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

  const isSpecificYear = fiscalYearId !== 'all' && !!fiscalYearId;
  const relevantContracts = isSpecificYear ? contracts : contracts.filter(c => c.status === 'active');
  const activeContractsCount = relevantContracts.length;
  const contractualRevenue = relevantContracts.reduce((sum, c) => sum + safeNumber(c.rent_amount), 0);

  const collectionSummary = useMemo(
    () => computeCollectionSummary(contracts, paymentInvoices),
    [contracts, paymentInvoices]
  );

  const isYearActive = fiscalYear?.status === 'active';
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

    // KPI جديد: التدفق النقدي الصافي
    const netCashFlow = safeNumber(netAfterExpenses) - safeNumber(adminShare) - safeNumber(waqifShare) - safeNumber(zakatAmount);

    // KPI جديد: نسبة التوزيع الفعلي
    const distributable = isYearActive ? safeNumber(netAfterZakat) : safeNumber(availableAmount);
    const distributionRatio = distributable > 0 ? Math.round((safeNumber(distributionsAmount) / distributable) * 100) : 0;

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
      { title: `التدفق النقدي الصافي${sharesNote}`, value: `${fmtInt(netCashFlow)} ر.س`, icon: ArrowDownUp, color: netCashFlow >= 0 ? 'bg-success' : 'bg-destructive', link: '/dashboard/accounts' },
      { title: 'نسبة التوزيع الفعلي', value: `${distributionRatio}%`, icon: PercentCircle, color: 'bg-accent', link: '/dashboard/beneficiaries' },
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

    return [
      { label: 'نسبة التحصيل', value: collectionRate, suffix: '%', color: colColor.text, progressColor: colColor.bar },
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

        {/* خريطة حرارية */}
        <ErrorBoundary>
          <Suspense fallback={<Skeleton className="h-[160px] w-full rounded-lg" />}>
            <CollectionHeatmap paymentInvoices={paymentInvoices} fiscalYearStart={fiscalYear?.start_date} fiscalYearEnd={fiscalYear?.end_date} />
          </Suspense>
        </ErrorBoundary>

        {/* جدول الإجراءات المعلقة */}
        <ErrorBoundary>
          <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
            <PendingActionsTable advanceRequests={advanceRequests} paymentInvoices={paymentInvoices} />
          </Suspense>
        </ErrorBoundary>

        {/* الرسوم البيانية */}
        <ErrorBoundary>
          <Suspense fallback={<ChartSkeleton />}>
            <DashboardCharts monthlyData={monthlyData} expenseTypes={expenseTypes} />
          </Suspense>
        </ErrorBoundary>

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

        {/* مراقبة أداء الصفحات — للناظر فقط */}
        {role === 'admin' && (
          <ErrorBoundary>
            <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-lg" />}>
              <PagePerformanceCard />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* آخر العقود */}
        <RecentContractsCard contracts={contracts} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
