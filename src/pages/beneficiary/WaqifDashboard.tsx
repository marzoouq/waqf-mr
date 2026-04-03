/**
 * لوحة تحكم مخصصة للواقف
 * تعرض ملخص شامل للوقف: العقارات، العقود، الأداء المالي، مؤشرات KPI
 */
import { fmt } from '@/utils/format';
import { computeMonthlyData, computeCollectionSummary, computeOccupancy } from '@/utils/dashboardComputations';
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useDashboardRealtime } from '@/hooks/ui/useDashboardRealtime';
import { useContractAllocations } from '@/hooks/financial/useContractAllocations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { useProperties } from '@/hooks/data/useProperties';
import { useContractsSafeByFiscalYear } from '@/hooks/data/useContracts';
import { useBeneficiariesSafe } from '@/hooks/data/useBeneficiaries';
import { useAllUnits } from '@/hooks/data/useUnits';
import { usePaymentInvoices } from '@/hooks/data/usePaymentInvoices';
import { DashboardLayout } from '@/components/layout';
import { NoPublishedYearsNotice, ExportMenu, DashboardSkeleton } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, FileText, Users, TrendingUp, Wallet, BarChart3, Sun, Moon,
} from 'lucide-react';

import WaqifWelcomeCard from '@/components/waqif/WaqifWelcomeCard';
import WaqifFinancialSection from '@/components/waqif/WaqifFinancialSection';
import WaqifOverviewStats from '@/components/waqif/WaqifOverviewStats';
import WaqifQuickLinks from '@/components/waqif/WaqifQuickLinks';

const LazyWaqifCharts = lazy(() => import('@/components/waqif/WaqifChartsInner'));

const WaqifDashboard = () => {
  const { user } = useAuth();
  
  const { fiscalYear, fiscalYearId, isLoading: fyLoading, noPublishedYears, isSpecificYear } = useFiscalYear();

  useDashboardRealtime('waqif-dashboard-realtime', ['income', 'expenses', 'payment_invoices']);
  const {
    totalIncome, totalExpenses, availableAmount, income, expenses, expensesByTypeExcludingVat, isLoading: finLoading,
  } = useFinancialSummary(fiscalYearId, fiscalYear?.label, { fiscalYearStatus: fiscalYear?.status });
  const { data: properties = [], isLoading: propLoading } = useProperties();
  const { data: contracts = [], isLoading: contLoading } = useContractsSafeByFiscalYear(fiscalYearId);
  const { data: allBeneficiaries = [], isLoading: benLoading } = useBeneficiariesSafe();
  const { data: allUnits = [] } = useAllUnits();
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId || 'all');
  const { data: contractAllocations = [] } = useContractAllocations(
    (fiscalYearId !== 'all' && !!fiscalYearId) ? fiscalYearId : undefined
  );

  const isLoading = fyLoading || finLoading || propLoading || contLoading || benLoading;
  const displayName = user?.email?.split('@')[0] || 'الواقف';

  const relevantContracts = isSpecificYear ? contracts : contracts.filter(c => c.status === 'active');
  const activeContracts = contracts.filter(c => c.status === 'active');
  const expiredContracts = contracts.filter(c => c.status === 'expired');

  const contractualRevenue = useMemo(() => {
    if (isSpecificYear && contractAllocations.length > 0) {
      const allocMap = new Map<string, number>();
      contractAllocations.forEach(a => {
        allocMap.set(a.contract_id, (allocMap.get(a.contract_id) ?? 0) + safeNumber(a.allocated_amount));
      });
      return relevantContracts.reduce((s, c) => s + (allocMap.get(c.id ?? '') ?? 0), 0);
    }
    return relevantContracts.reduce((s, c) => s + safeNumber(c.rent_amount), 0);
  }, [relevantContracts, contractAllocations, isSpecificYear]);

  const collectionSummary = useMemo(() => {
    const result = computeCollectionSummary(activeContracts, paymentInvoices);
    return { onTime: result.paidCount + result.partialCount, late: result.unpaidCount, total: result.total, percentage: result.percentage };
  }, [activeContracts, paymentInvoices]);

  const kpis = useMemo(() => {
    const collectionRate = collectionSummary.percentage;
    const { occupancyRate } = computeOccupancy(contracts, allUnits, isSpecificYear);
    const expenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;
    return [
      { label: 'نسبة التحصيل', value: collectionSummary.total === 0 ? '—' : collectionRate, suffix: collectionSummary.total === 0 ? '' : '%', color: collectionSummary.total === 0 ? 'text-muted-foreground' : (collectionRate >= 80 ? 'text-success' : collectionRate >= 50 ? 'text-warning' : 'text-destructive'), progressColor: collectionSummary.total === 0 ? '[&>div]:bg-muted' : (collectionRate >= 80 ? '[&>div]:bg-success' : collectionRate >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive') },
      { label: 'معدل الإشغال', value: occupancyRate, suffix: '%', color: occupancyRate >= 80 ? 'text-success' : occupancyRate >= 50 ? 'text-warning' : 'text-destructive', progressColor: occupancyRate >= 80 ? '[&>div]:bg-success' : occupancyRate >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive' },
      { label: expenseRatio > 100 ? 'عجز مالي' : 'نسبة المصروفات', value: expenseRatio, suffix: '%', color: expenseRatio > 100 ? 'text-destructive font-bold' : (expenseRatio <= 20 ? 'text-success' : expenseRatio <= 40 ? 'text-warning' : 'text-destructive'), progressColor: expenseRatio > 100 ? '[&>div]:bg-destructive' : (expenseRatio <= 20 ? '[&>div]:bg-success' : expenseRatio <= 40 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive') },
    ];
  }, [collectionSummary.percentage, collectionSummary.total, totalIncome, totalExpenses, allUnits, contracts, isSpecificYear]);

  const monthlyData = useMemo(() => computeMonthlyData(income, expenses), [income, expenses]);

  /* ── Live clock ── */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => { id = setInterval(() => setNow(new Date()), 60_000); };
    const stop = () => { if (id) { clearInterval(id); id = undefined; } };
    const onVisibility = () => { if (document.hidden) stop(); else { setNow(new Date()); start(); } };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const { greeting, GreetingIcon, hijriDate, gregorianDate, timeStr } = useMemo(() => {
    const h = now.getHours();
    return {
      greeting: h < 12 ? 'صباح الخير' : 'مساء الخير',
      GreetingIcon: h < 12 ? Sun : Moon,
      hijriDate: now.toLocaleDateString('ar-SA-u-ca-islamic', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      gregorianDate: now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
      timeStr: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
  }, [now]);

  const quickLinks = [
    { title: 'العقارات', icon: Building2, path: '/beneficiary/properties', color: 'bg-primary/10 text-primary' },
    { title: 'العقود', icon: FileText, path: '/beneficiary/contracts', color: 'bg-accent/10 text-accent-foreground' },
    { title: 'التقارير المالية', icon: BarChart3, path: '/beneficiary/financial-reports', color: 'bg-muted text-muted-foreground' },
    { title: 'الحسابات الختامية', icon: Wallet, path: '/beneficiary/accounts', color: 'bg-secondary/10 text-secondary' },
    { title: 'اللائحة', icon: BookOpen, path: '/beneficiary/bylaws', color: 'bg-primary/10 text-primary' },
  ];

  const overviewStats = [
    { title: 'العقارات', value: properties.length, icon: Building2, bg: 'bg-primary/10 text-primary' },
    { title: 'العقود النشطة', value: activeContracts.length, icon: FileText, bg: 'bg-accent/10 text-accent-foreground' },
    { title: 'المستفيدون', value: allBeneficiaries.length, icon: Users, bg: 'bg-secondary/10 text-secondary' },
    { title: 'القابل للتوزيع', value: fiscalYear?.status === 'active' ? 'تُحسب عند الإقفال' : `${fmt(safeNumber(availableAmount))} ر.س`, icon: TrendingUp, bg: 'bg-primary/10 text-primary' },
  ];

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

        {/* ═══ Overview Stats ═══ */}
        <WaqifOverviewStats stats={overviewStats} />

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

        <WaqifQuickLinks />
      </div>
    </DashboardLayout>
  );
};

export default WaqifDashboard;
