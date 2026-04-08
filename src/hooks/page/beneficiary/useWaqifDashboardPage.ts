/**
 * هوك لوحة تحكم الواقف — يستخرج كل البيانات والحسابات من الصفحة
 * محسّن: يستخدم RPC المستفيد المجمّع + utility مشتركة
 */
import { useMemo } from 'react';
import { fmt } from '@/utils/format/format';
import { computeCollectionSummary, computeOccupancy } from '@/utils/financial/dashboardComputations';
import { safeNumber } from '@/utils/format/safeNumber';
import { buildMonthlyData } from '@/utils/financial/buildMonthlyData';
import { useBeneficiaryFinancials } from '@/hooks/page/beneficiary/useBeneficiaryFinancials';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useDashboardRealtime } from '@/hooks/ui/useDashboardRealtime';
import { useContractAllocations } from '@/hooks/data/financial/useContractAllocations';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useBeneficiaryDashboardData } from '@/hooks/page/beneficiary/useBeneficiaryDashboardData';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useAllUnits } from '@/hooks/data/properties/useUnits';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { Building2, FileText, Users, TrendingUp } from 'lucide-react';

export const useWaqifDashboardPage = () => {
  const { user } = useAuth();
  const { fiscalYear, fiscalYearId, isLoading: fyLoading, noPublishedYears, isSpecificYear } = useFiscalYear();

  useDashboardRealtime('waqif-dashboard-realtime', ['income', 'expenses', 'payment_invoices']);

  const { data: dashData, isLoading: dashLoading } = useBeneficiaryDashboardData(fiscalYearId);

  // استخدام الهوك المشترك بدلاً من الاستخراج اليدوي
  const fin = useBeneficiaryFinancials(dashData, fiscalYearId);
  const { totalIncome, totalExpenses, availableAmount, expensesByTypeExcludingVat } = fin;

  const { data: properties = [], isLoading: propLoading } = useProperties();
  const { data: contracts = [], isLoading: contLoading } = useContractsSafeByFiscalYear(fiscalYearId);
  const { data: allUnits = [] } = useAllUnits();
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId ?? undefined);
  const { data: contractAllocations = [] } = useContractAllocations(
    (fiscalYearId !== 'all' && !!fiscalYearId) ? fiscalYearId : undefined
  );

  const isLoading = fyLoading || dashLoading || propLoading || contLoading;
  const displayName = user?.email?.split('@')[0] || 'الواقف';

  const relevantContracts = isSpecificYear ? contracts : contracts.filter(c => c.status === 'active');
  const activeContracts = contracts.filter(c => c.status === 'active');
  const expiredContracts = contracts.filter(c => c.status === 'expired');

  // #12 — عدد المستفيدين الفعلي من RPC بدل الحساب التقريبي
  const beneficiaryCount = dashData?.beneficiary_count ?? 0;

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

  // بناء monthlyData من utility مشتركة (#11)
  const monthlyData = useMemo(
    () => buildMonthlyData(dashData?.monthly_income ?? [], dashData?.monthly_expenses ?? []),
    [dashData?.monthly_income, dashData?.monthly_expenses],
  );

  /* ── التحية والتاريخ — #36: إعادة greetingIconName بدل GreetingIcon component ── */
  const { greeting, greetingIconName, hijriDate, gregorianDate, timeStr } = useMemo(() => {
    const now = new Date();
    const h = now.getHours();
    return {
      greeting: h < 12 ? 'صباح الخير' : 'مساء الخير',
      greetingIconName: h < 12 ? 'sun' : 'moon' as 'sun' | 'moon',
      hijriDate: now.toLocaleDateString('ar-SA-u-ca-islamic', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      gregorianDate: now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
      timeStr: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
  }, []);

  const overviewStats = [
    { title: 'العقارات', value: properties.length, icon: Building2, bg: 'bg-primary/10 text-primary' },
    { title: 'العقود النشطة', value: activeContracts.length, icon: FileText, bg: 'bg-accent/10 text-accent-foreground' },
    { title: 'المستفيدون', value: beneficiaryCount || '—', icon: Users, bg: 'bg-secondary/10 text-secondary' },
    { title: 'القابل للتوزيع', value: fiscalYear?.status === 'active' ? 'تُحسب عند الإقفال' : `${fmt(safeNumber(availableAmount))} ر.س`, icon: TrendingUp, bg: 'bg-primary/10 text-primary' },
  ];

  const expenseData = useMemo(
    () => Object.entries(expensesByTypeExcludingVat).map(([name, value]) => ({ name, value })),
    [expensesByTypeExcludingVat],
  );

  return {
    isLoading, noPublishedYears,
    displayName, greeting, greetingIconName, hijriDate, gregorianDate, timeStr,
    overviewStats, kpis,
    fiscalYear, totalIncome, totalExpenses, availableAmount,
    activeContracts, expiredContracts,
    contractualRevenue, collectionSummary,
    monthlyData, expenseData,
  };
};
