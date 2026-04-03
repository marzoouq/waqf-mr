/**
 * هوك حساب إحصائيات ومؤشرات لوحة التحكم الرئيسية
 */
import { useMemo } from 'react';
import { fmtInt } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';
import { computeCollectionSummary, computeOccupancy } from '@/utils/dashboardComputations';
import { calcChangePercent } from '@/hooks/financial/useYoYComparison';
import { Building2, FileText, TrendingUp, TrendingDown, Users, Wallet, UserCheck, Crown, DollarSign, Landmark, HandCoins, ArrowDownUp, PercentCircle } from 'lucide-react';
import type { StatItem, KpiItem } from '@/components/dashboard';

// دالة مساعدة موحّدة لألوان KPI
const getKpiColor = (value: number, good: number, warn: number, invert = false) => {
  const isGood = invert ? value <= good : value >= good;
  const isWarn = invert ? value <= warn : value >= warn;
  if (isGood) return { text: 'text-success', bar: '[&>div]:bg-success' };
  if (isWarn) return { text: 'text-warning', bar: '[&>div]:bg-warning' };
  return { text: 'text-destructive', bar: '[&>div]:bg-destructive' };
};

interface UseAdminDashboardStatsParams {
  properties: { length: number };
  activeContractsCount: number;
  contractualRevenue: number;
  totalIncome: number;
  totalExpenses: number;
  netAfterExpenses: number;
  netAfterZakat: number;
  availableAmount: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  distributionsAmount: number;
  beneficiaries: { share_percentage?: number | null }[];
  isYearActive: boolean;
  sharesNote: string;
  yoy: {
    hasPrevYear: boolean;
    prevTotalIncome: number;
    prevTotalExpenses: number;
    prevNetAfterExpenses: number;
  };
  contracts: { status?: string; end_date: string; id: string }[];
  paymentInvoices: { contract_id: string; status: string; due_date: string; amount: number; paid_amount: number }[];
  allUnits: unknown[];
  isSpecificYear: boolean;
}

export function useAdminDashboardStats(params: UseAdminDashboardStatsParams) {
  const {
    properties, activeContractsCount, contractualRevenue,
    totalIncome, totalExpenses, netAfterExpenses, netAfterZakat,
    availableAmount, adminShare, waqifShare, waqfRevenue,
    distributionsAmount, beneficiaries, isYearActive, sharesNote,
    yoy, contracts, paymentInvoices, allUnits, isSpecificYear,
  } = params;

  const collectionSummary = useMemo(
    () => computeCollectionSummary(contracts, paymentInvoices),
    [contracts, paymentInvoices]
  );

  const collectionColor = useMemo(() => getKpiColor(collectionSummary.percentage, 80, 50), [collectionSummary.percentage]);

  const stats: StatItem[] = useMemo(() => {
    const incomeChange = yoy.hasPrevYear ? calcChangePercent(totalIncome, yoy.prevTotalIncome) : null;
    const expenseChange = yoy.hasPrevYear ? calcChangePercent(totalExpenses, yoy.prevTotalExpenses) : null;
    const netChange = yoy.hasPrevYear ? calcChangePercent(netAfterExpenses, yoy.prevNetAfterExpenses) : null;

    const netCashFlow = safeNumber(waqfRevenue);
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
      { title: 'حصة الناظر', value: isYearActive ? 'تُحسب عند الإقفال' : `${fmtInt(adminShare)} ر.س`, icon: UserCheck, color: 'bg-accent', link: '/dashboard/accounts' },
      { title: 'حصة الواقف', value: isYearActive ? 'تُحسب عند الإقفال' : `${fmtInt(waqifShare)} ر.س`, icon: Crown, color: 'bg-secondary', link: '/dashboard/accounts' },
      { title: 'ريع الوقف', value: isYearActive ? 'تُحسب عند الإقفال' : `${fmtInt(waqfRevenue)} ر.س`, icon: Wallet, color: 'bg-primary', link: '/dashboard/beneficiaries' },
      { title: 'المستفيدون النشطون', value: beneficiaries.filter(b => (b.share_percentage ?? 0) > 0).length, icon: Users, color: 'bg-muted', link: '/dashboard/beneficiaries' },
      { title: `التدفق النقدي الصافي${sharesNote}`, value: isYearActive ? 'يُحسب عند الإقفال' : `${fmtInt(netCashFlow)} ر.س`, icon: ArrowDownUp, color: netCashFlow >= 0 ? 'bg-success' : 'bg-destructive', link: '/dashboard/accounts' },
      { title: 'نسبة التوزيع الفعلي', value: isYearActive ? '—' : `${distributionRatio}%`, icon: PercentCircle, color: 'bg-accent', link: '/dashboard/beneficiaries' },
    ];
  }, [properties.length, activeContractsCount, contractualRevenue, totalIncome, totalExpenses, netAfterExpenses, netAfterZakat, availableAmount, adminShare, waqifShare, waqfRevenue, distributionsAmount, beneficiaries, isYearActive, sharesNote, yoy]);

  const kpis: KpiItem[] = useMemo(() => {
    const collectionRate = collectionSummary.percentage;
    const { occupancyRate } = computeOccupancy(contracts as Parameters<typeof computeOccupancy>[0], allUnits as Parameters<typeof computeOccupancy>[1], isSpecificYear);
    const avgRent = activeContractsCount > 0 ? Math.round(contractualRevenue / activeContractsCount) : 0;
    const expenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

    const colColor = getKpiColor(collectionRate, 80, 50);
    const occColor = getKpiColor(occupancyRate, 80, 50);
    const expColor = getKpiColor(expenseRatio, 20, 40, true);

    const prevExpenseRatio = yoy.hasPrevYear && yoy.prevTotalIncome > 0
      ? Math.round((yoy.prevTotalExpenses / yoy.prevTotalIncome) * 100) : null;
    const expenseRatioChange = prevExpenseRatio !== null ? calcChangePercent(expenseRatio, prevExpenseRatio) : null;

    const hasInvoicesDue = collectionSummary.total > 0;

    return [
      { label: 'نسبة التحصيل', value: hasInvoicesDue ? collectionRate : 0, suffix: hasInvoicesDue ? '%' : '', color: hasInvoicesDue ? colColor.text : 'text-muted-foreground', progressColor: hasInvoicesDue ? colColor.bar : '' },
      { label: 'معدل الإشغال', value: occupancyRate, suffix: '%', color: occColor.text, progressColor: occColor.bar },
      { label: 'متوسط الإيجار', value: avgRent, suffix: ' ر.س', color: 'text-primary', progressColor: '' },
      { label: expenseRatio > 100 ? 'عجز مالي' : 'نسبة المصروفات', value: expenseRatio, suffix: '%', color: expenseRatio > 100 ? 'text-destructive font-bold' : expColor.text, progressColor: expenseRatio > 100 ? '[&>div]:bg-destructive' : expColor.bar, yoyChange: expenseRatioChange, invertColor: true },
    ];
  }, [collectionSummary, totalIncome, totalExpenses, allUnits, activeContractsCount, contractualRevenue, contracts, isSpecificYear, yoy]);

  return { stats, kpis, collectionSummary, collectionColor };
}
