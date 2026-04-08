/**
 * هوك حساب إحصائيات ومؤشرات لوحة التحكم الرئيسية — يقرأ أرقام جاهزة من RPC
 */
import { useMemo } from 'react';
import { fmtInt } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';
import { calcChangePercent } from '@/utils/financial/calcChangePercent';
import { Building2, FileText, TrendingUp, TrendingDown, Users, Wallet, UserCheck, Crown, DollarSign, Landmark, HandCoins, ArrowDownUp, PercentCircle } from 'lucide-react';
import type { StatItem, KpiItem } from '@/components/dashboard';
import type { AggregatedCollection, AggregatedOccupancy } from '@/hooks/data/financial/useDashboardSummary';

const getKpiColor = (value: number, good: number, warn: number, invert = false) => {
  const isGood = invert ? value <= good : value >= good;
  const isWarn = invert ? value <= warn : value >= warn;
  if (isGood) return { text: 'text-success', bar: '[&>div]:bg-success' };
  if (isWarn) return { text: 'text-warning', bar: '[&>div]:bg-warning' };
  return { text: 'text-destructive', bar: '[&>div]:bg-destructive' };
};

/** بطاقات خاصة بالناظر فقط — لا تُعرض للمحاسب */
const ADMIN_ONLY_TITLES = new Set(['حصة الناظر', 'حصة الواقف', 'ريع الوقف']);

interface UseAdminDashboardStatsParams {
  propertiesCount: number;
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
  beneficiariesCount: number;
  isYearActive: boolean;
  sharesNote: string;
  yoy: {
    hasPrevYear: boolean;
    prevTotalIncome: number;
    prevTotalExpenses: number;
    prevNetAfterExpenses: number;
  };
  collection: AggregatedCollection | null;
  occupancy: AggregatedOccupancy | null;
  /** دور المستخدم — يُستخدم لتصفية البطاقات حسب الصلاحية */
  role?: string | null;
}

export function useAdminDashboardStats(params: UseAdminDashboardStatsParams) {
  const {
    propertiesCount, activeContractsCount, contractualRevenue,
    totalIncome, totalExpenses, netAfterExpenses, netAfterZakat,
    availableAmount, adminShare, waqifShare, waqfRevenue,
    distributionsAmount, beneficiariesCount, isYearActive, sharesNote,
    yoy, collection, occupancy, role,
  } = params;

  // ── ملخص التحصيل (جاهز من RPC) ──
  const collectionSummary = useMemo(() => ({
    paidCount: collection?.paid_count ?? 0,
    partialCount: collection?.partial_count ?? 0,
    unpaidCount: collection?.unpaid_count ?? 0,
    total: collection?.total ?? 0,
    percentage: collection?.percentage ?? 0,
    totalCollected: collection?.total_collected ?? 0,
    totalExpected: collection?.total_expected ?? 0,
  }), [collection]);

  const collectionColor = useMemo(() => getKpiColor(collectionSummary.percentage, 80, 50), [collectionSummary.percentage]);

  const stats: StatItem[] = useMemo(() => {
    const incomeChange = yoy.hasPrevYear ? calcChangePercent(totalIncome, yoy.prevTotalIncome) : null;
    const expenseChange = yoy.hasPrevYear ? calcChangePercent(totalExpenses, yoy.prevTotalExpenses) : null;
    const netChange = yoy.hasPrevYear ? calcChangePercent(netAfterExpenses, yoy.prevNetAfterExpenses) : null;

    const netCashFlow = safeNumber(waqfRevenue);
    const distributable = safeNumber(availableAmount);
    const distributionRatio = distributable > 0 ? Math.round((safeNumber(distributionsAmount) / distributable) * 100) : 0;

    const allStats: StatItem[] = [
      { title: 'إجمالي العقارات', value: propertiesCount, icon: Building2, color: 'bg-primary', link: '/dashboard/properties' },
      { title: 'العقود النشطة', value: activeContractsCount, icon: FileText, color: 'bg-secondary', link: '/dashboard/contracts' },
      { title: 'الإيرادات التعاقدية', value: `${fmtInt(contractualRevenue)} ر.س`, icon: TrendingUp, color: 'bg-success', link: '/dashboard/contracts' },
      { title: 'إجمالي الدخل الفعلي', value: `${fmtInt(totalIncome)} ر.س`, icon: DollarSign, color: 'bg-primary', link: '/dashboard/income', yoyChange: incomeChange, invertColor: false },
      { title: 'إجمالي المصروفات', value: `${fmtInt(totalExpenses)} ر.س`, icon: TrendingDown, color: 'bg-destructive', link: '/dashboard/expenses', yoyChange: expenseChange, invertColor: true },
      { title: `صافي الريع${sharesNote}`, value: `${fmtInt(netAfterExpenses)} ر.س`, icon: Landmark, color: 'bg-success', link: '/dashboard/accounts', yoyChange: netChange, invertColor: false },
      { title: isYearActive ? `صافي متاح (قبل الحصص)${sharesNote}` : `المتاح للتوزيع`, value: `${fmtInt(Math.max(0, isYearActive ? netAfterZakat : availableAmount))} ر.س`, icon: HandCoins, color: 'bg-primary', link: '/dashboard/accounts' },
      { title: 'حصة الناظر', value: isYearActive ? 'تُحسب عند الإقفال' : `${fmtInt(adminShare)} ر.س`, icon: UserCheck, color: 'bg-accent', link: '/dashboard/accounts' },
      { title: 'حصة الواقف', value: isYearActive ? 'تُحسب عند الإقفال' : `${fmtInt(waqifShare)} ر.س`, icon: Crown, color: 'bg-secondary', link: '/dashboard/accounts' },
      { title: 'ريع الوقف', value: isYearActive ? 'تُحسب عند الإقفال' : `${fmtInt(waqfRevenue)} ر.س`, icon: Wallet, color: 'bg-primary', link: '/dashboard/beneficiaries' },
      { title: 'المستفيدون النشطون', value: beneficiariesCount, icon: Users, color: 'bg-muted', link: '/dashboard/beneficiaries' },
      { title: `التدفق النقدي الصافي${sharesNote}`, value: isYearActive ? 'يُحسب عند الإقفال' : `${fmtInt(netCashFlow)} ر.س`, icon: ArrowDownUp, color: netCashFlow >= 0 ? 'bg-success' : 'bg-destructive', link: '/dashboard/accounts' },
      { title: 'نسبة التوزيع الفعلي', value: isYearActive ? '—' : `${distributionRatio}%${isYearActive ? ' *تقديري' : ''}`, icon: PercentCircle, color: 'bg-accent', link: '/dashboard/beneficiaries' },
    ];

    // تصفية بطاقات خاصة بالناظر عند عرض لوحة المحاسب
    if (role === 'accountant') {
      return allStats.filter(s => !ADMIN_ONLY_TITLES.has(s.title));
    }
    return allStats;
  }, [propertiesCount, activeContractsCount, contractualRevenue, totalIncome, totalExpenses, netAfterExpenses, netAfterZakat, availableAmount, adminShare, waqifShare, waqfRevenue, distributionsAmount, beneficiariesCount, isYearActive, sharesNote, yoy, role]);

  const kpis: KpiItem[] = useMemo(() => {
    const collectionRate = collectionSummary.percentage;
    const occupancyRate = occupancy?.rate ?? 0;
    const avgRent = activeContractsCount > 0 && contractualRevenue > 0
      ? Math.round(contractualRevenue / activeContractsCount)
      : 0;
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
  }, [collectionSummary, totalIncome, totalExpenses, activeContractsCount, contractualRevenue, occupancy, yoy]);

  return { stats, kpis, collectionSummary, collectionColor };
}
