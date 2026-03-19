import { fmt } from '@/utils/format';
/**
 * لوحة تحكم مخصصة للواقف
 * تعرض ملخص شامل للوقف: العقارات، العقود، الأداء المالي، مؤشرات KPI
 */
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useProperties } from '@/hooks/useProperties';
import { useContractsSafeByFiscalYear } from '@/hooks/useContracts';
import { useBeneficiariesSafe } from '@/hooks/useBeneficiaries';
import { useAllUnits } from '@/hooks/useUnits';
import { usePaymentInvoices } from '@/hooks/usePaymentInvoices';
import DashboardLayout from '@/components/DashboardLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';
import ExportMenu from '@/components/ExportMenu';
import { Progress } from '@/components/ui/progress';
import {
  Building2, FileText, Users, TrendingUp, Wallet, BarChart3, BookOpen,
  Sun, Moon, Calendar, Clock, Gauge, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const LazyWaqifCharts = lazy(() => import('@/components/waqif/WaqifChartsInner'));



const WaqifDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fiscalYear, fiscalYearId, isLoading: fyLoading, noPublishedYears } = useFiscalYear();
  const {
    totalIncome, totalExpenses, availableAmount,
    income, expenses,
    expensesByTypeExcludingVat,
    isLoading: finLoading,
  } = useFinancialSummary(fiscalYearId, fiscalYear?.label, { fiscalYearStatus: fiscalYear?.status });
  const { data: properties = [], isLoading: propLoading } = useProperties();
  const { data: contracts = [], isLoading: contLoading } = useContractsSafeByFiscalYear(fiscalYearId);
  const { data: allBeneficiaries = [], isLoading: benLoading } = useBeneficiariesSafe();
  const { data: allUnits = [] } = useAllUnits();
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId || 'all');

  const isLoading = fyLoading || finLoading || propLoading || contLoading || benLoading;
  const displayName = user?.email?.split('@')[0] || 'الواقف';

  const activeContracts = contracts.filter(c => c.status === 'active');
  const expiredContracts = contracts.filter(c => c.status === 'expired');
  const contractualRevenue = activeContracts.reduce((s, c) => s + safeNumber(c.rent_amount), 0);

  /* ── Collection summary — بالمبالغ (موحّد مع AdminDashboard — BUG-W1/W2) ── */
  const collectionSummary = useMemo(() => {
    const relevantContractIds = new Set(
      contracts.filter(c => c.status === 'active' || c.status === 'expired').map(c => c.id)
    );
    const nowDate = new Date();
    const dueInvoices = paymentInvoices.filter(
      inv => relevantContractIds.has(inv.contract_id) && new Date(inv.due_date) <= nowDate
    );
    const totalExpected = dueInvoices.reduce((sum, inv) => sum + safeNumber(inv.amount), 0);
    const totalCollected = dueInvoices.reduce((sum, inv) => {
      if (inv.status === 'paid') return sum + safeNumber(inv.amount);
      if (inv.status === 'partially_paid') return sum + safeNumber(inv.paid_amount);
      return sum;
    }, 0);
    const paidCount = dueInvoices.filter(inv => inv.status === 'paid' || inv.status === 'partially_paid').length;
    const unpaidCount = dueInvoices.length - paidCount;
    const percentage = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    return { onTime: paidCount, late: unpaidCount, total: dueInvoices.length, percentage };
  }, [contracts, paymentInvoices]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const collectionRate = collectionSummary.percentage;
    // BUG-I fix: حساب الإشغال بناءً على العقود النشطة (موحّد مع PropertiesPage)
    const rentedUnitIds = new Set(
      contracts.filter(c => c.status === 'active' && c.unit_id).map(c => c.unit_id)
    );
    const wholePropertyRentedIds = new Set(
      contracts.filter(c => c.status === 'active' && !c.unit_id).map(c => c.property_id)
    );
    const rentedUnits = allUnits.filter(u =>
      rentedUnitIds.has(u.id) || wholePropertyRentedIds.has(u.property_id)
    ).length;
    const totalUnitsCount = allUnits.length;
    const occupancyRate = totalUnitsCount > 0 ? Math.round((rentedUnits / totalUnitsCount) * 100) : (activeContracts.length > 0 ? 100 : 0);
    const expenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

    return [
      { label: 'نسبة التحصيل', value: collectionRate, suffix: '%', color: collectionRate >= 80 ? 'text-success' : collectionRate >= 50 ? 'text-warning' : 'text-destructive', progressColor: collectionRate >= 80 ? '[&>div]:bg-success' : collectionRate >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive' },
      { label: 'معدل الإشغال', value: occupancyRate, suffix: '%', color: occupancyRate >= 80 ? 'text-success' : occupancyRate >= 50 ? 'text-warning' : 'text-destructive', progressColor: occupancyRate >= 80 ? '[&>div]:bg-success' : occupancyRate >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive' },
      { label: expenseRatio > 100 ? 'عجز مالي' : 'نسبة المصروفات', value: expenseRatio, suffix: '%', color: expenseRatio > 100 ? 'text-destructive font-bold' : (expenseRatio <= 20 ? 'text-success' : expenseRatio <= 40 ? 'text-warning' : 'text-destructive'), progressColor: expenseRatio > 100 ? '[&>div]:bg-destructive' : (expenseRatio <= 20 ? '[&>div]:bg-success' : expenseRatio <= 40 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive') },
    ];
  }, [collectionSummary.percentage, totalIncome, totalExpenses, allUnits, activeContracts.length]);

  /* ── Monthly chart data ── */
  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {};
    income.forEach(item => {
      const month = item.date?.substring(0, 7);
      if (month) { if (!months[month]) months[month] = { income: 0, expenses: 0 }; months[month].income += safeNumber(item.amount); }
    });
    expenses.forEach(item => {
      const month = item.date?.substring(0, 7);
      if (month) { if (!months[month]) months[month] = { income: 0, expenses: 0 }; months[month].expenses += safeNumber(item.amount); }
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, income: data.income, expenses: data.expenses }));
  }, [income, expenses]);

  // formatArabicMonth moved to module level (PERF-01)

  // COLORS moved to module level (see top of file)

  /* ── Live clock ── */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    const onVisibility = () => { if (document.visibilityState === 'visible') setNow(new Date()); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const GreetingIcon = hour < 12 ? Sun : Moon;
  const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const gregorianDate = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  const quickLinks = [
    { title: 'العقارات', icon: Building2, path: '/beneficiary/properties', color: 'bg-primary/10 text-primary' },
    { title: 'العقود', icon: FileText, path: '/beneficiary/contracts', color: 'bg-accent/10 text-accent-foreground' },
    { title: 'التقارير المالية', icon: BarChart3, path: '/beneficiary/financial-reports', color: 'bg-muted text-muted-foreground' },
    { title: 'الحسابات الختامية', icon: Wallet, path: '/beneficiary/accounts', color: 'bg-secondary/10 text-secondary' },
    { title: 'اللائحة', icon: BookOpen, path: '/beneficiary/bylaws', color: 'bg-primary/10 text-primary' },
  ];

  if (isLoading) return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-3 sm:p-6 space-y-4">
          <Card className="overflow-hidden border-0 shadow-lg gradient-primary text-primary-foreground">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center"><GreetingIcon className="w-6 h-6" /></div>
                <div><p className="text-sm text-primary-foreground/80">{greeting}</p><h1 className="text-xl sm:text-2xl font-bold font-display">{displayName}</h1></div>
              </div>
            </CardContent>
          </Card>
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">

        {/* ═══ Welcome Card ═══ */}
        <Card className="overflow-hidden border-0 shadow-lg gradient-primary text-primary-foreground animate-slide-up">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center shrink-0"><GreetingIcon className="w-6 h-6 sm:w-7 sm:h-7" /></div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base text-primary-foreground/80">{greeting}</p>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">{displayName}</h1>
                  <p className="text-xs sm:text-sm text-primary-foreground/70 mt-0.5">لوحة متابعة الوقف</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-primary-foreground/85 shrink-0">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{hijriDate}</span>
                <span className="hidden sm:inline text-primary-foreground/40">|</span>
                <span>{gregorianDate}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{timeStr}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <ExportMenu hidePdf />
        </div>

        {/* ═══ Overview Stats ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { title: 'العقارات', value: properties.length, icon: Building2, bg: 'bg-primary/10 text-primary' },
            { title: 'العقود النشطة', value: activeContracts.length, icon: FileText, bg: 'bg-accent/10 text-accent-foreground' },
            { title: 'المستفيدون', value: allBeneficiaries.length, icon: Users, bg: 'bg-secondary/10 text-secondary' },
            { title: 'القابل للتوزيع', value: `${fmt(safeNumber(availableAmount))} ر.س`, icon: TrendingUp, bg: 'bg-primary/10 text-primary' },
          ].map((stat, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}><stat.icon className="w-5 h-5" /></div>
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">{stat.title}</p><p className="text-lg sm:text-xl font-bold truncate tabular-nums">{stat.value}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══ KPI Panel ═══ */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Gauge className="w-5 h-5" />
              مؤشرات الأداء الرئيسية
              <Badge variant="outline" className="text-[11px]">{fiscalYear?.label || '—'}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="text-center space-y-1 sm:space-y-2 p-3 sm:p-4 rounded-lg bg-muted/30">
                  <p className="text-xs sm:text-sm text-muted-foreground">{kpi.label}</p>
                  <p className={`text-xl sm:text-3xl font-bold tabular-nums ${kpi.color}`}>{fmt(kpi.value)}{kpi.suffix}</p>
                  {kpi.progressColor && <Progress value={Math.min(kpi.value, 100)} className={`h-2 ${kpi.progressColor}`} />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ═══ Financial Summary + Contracts Status ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wallet className="w-5 h-5" /> التسلسل المالي
                <Badge variant="outline" className="text-[11px]">{fiscalYear?.label || '—'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'إجمالي الدخل', value: totalIncome, cls: 'text-primary' },
                { label: 'إجمالي المصروفات', value: totalExpenses, cls: 'text-destructive' },
                { label: 'الريع القابل للتوزيع', value: availableAmount, cls: 'font-bold text-lg' },
              ].map((row, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${i === 2 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'}`}>
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className={`font-bold ${row.cls}`}>{fmt(safeNumber(row.value))} ر.س</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><FileText className="w-5 h-5" /> حالة العقود والتحصيل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /><span className="text-sm">نشطة</span></div>
                <Badge variant="default">{activeContracts.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /><span className="text-sm">منتهية</span></div>
                <Badge variant="secondary">{expiredContracts.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">إجمالي قيمة العقود النشطة</span>
                <span className="font-bold">{fmt(contractualRevenue)} ر.س</span>
              </div>
              {collectionSummary.total > 0 && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
                    <span className="text-sm">تحصيل منتظم</span>
                    <span className="font-bold text-success">{collectionSummary.onTime} فاتورة</span>
                  </div>
                  {collectionSummary.late > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <span className="text-sm">تحصيل متأخر</span>
                      <span className="font-bold text-destructive">{collectionSummary.late} فاتورة</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ═══ Charts ═══ */}
        {(monthlyData.length > 0 || (expensesByTypeExcludingVat && Object.keys(expensesByTypeExcludingVat).length > 0)) && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><BarChart3 className="w-5 h-5" /> الرسوم البيانية</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-[280px] w-full rounded-lg" />}>
                <LazyWaqifCharts
                  monthlyData={monthlyData}
                  expenseData={Object.entries(expensesByTypeExcludingVat).map(([name, value]) => ({ name, value }))}
                />
              </Suspense>
            </CardContent>
          </Card>
        )}

        {/* ═══ Quick Links ═══ */}
        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3">الوصول السريع</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {quickLinks.map((link) => (
              <Card key={link.path} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow group" onClick={() => navigate(link.path)}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.color}`}><link.icon className="w-5 h-5" /></div>
                    <p className="font-bold text-sm">{link.title}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WaqifDashboard;
