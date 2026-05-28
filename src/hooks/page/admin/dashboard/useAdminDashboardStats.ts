/**
 * هوك حساب إحصائيات ومؤشرات لوحة التحكم الرئيسية — يقرأ أرقام جاهزة من RPC
 */
import { useMemo } from 'react';
import { fmtInt } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';
import { calcChangePercent } from '@/utils/financial/calcChangePercent';
import { computeExpenseRatio, EXPENSE_RATIO_FULL_DEFICIT } from '@/utils/financial/ratios';
import { Building2, FileText, TrendingDown, Users, DollarSign, Landmark, ArrowDownUp } from 'lucide-react';
import type { StatItem, KpiItem } from '@/types/dashboard';
import type { AggregatedCollection, AggregatedOccupancy } from '@/hooks/data/financial/useDashboardSummary';

const getKpiColor = (value: number, good: number, warn: number, invert = false) => {
  const isGood = invert ? value <= good : value >= good;
  const isWarn = invert ? value <= warn : value >= warn;
  if (isGood) return { text: 'text-success', bar: '[&>div]:bg-success' };
  if (isWarn) return { text: 'text-warning', bar: '[&>div]:bg-warning' };
  return { text: 'text-destructive', bar: '[&>div]:bg-destructive' };
};

// ملاحظة: تصفية بطاقات الناظر تتم عبر metadata `visibility: 'admin-only'`
// المُعرّفة على كل StatItem — لا تعتمد على النصوص العربية (مرونة i18n + سلامة صلاحيات).

interface UseAdminDashboardStatsParams {
  propertiesCount: number;
  activeContractsCount: number;
  /** @deprecated مُرحَّل لـ ContractStatsCards — يبقى في التوقيع لتفادي تكسير الواجهة */
  contractualRevenue?: number;
  totalIncome: number;
  totalExpenses: number;
  netAfterExpenses: number;
  /** @deprecated غير مستخدم بعد Wave D */
  netAfterZakat?: number;
  /** @deprecated مُرحَّل لـ DistributionsPage */
  availableAmount?: number;
  /** @deprecated مُرحَّل لـ AccountsSummaryCards */
  adminShare?: number;
  /** @deprecated مُرحَّل لـ AccountsSummaryCards */
  waqifShare?: number;
  waqfRevenue: number;
  /** @deprecated مُرحَّل لـ DistributionsPage */
  distributionsAmount?: number;
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
  /** @deprecated مُرحَّل لـ PropertySummaryCards (Progress) */
  occupancy?: AggregatedOccupancy | null;
  /** دور المستخدم — يُستخدم لتصفية البطاقات حسب الصلاحية */
  role?: string | null;
}

export function useAdminDashboardStats(params: UseAdminDashboardStatsParams) {
  const {
    propertiesCount, activeContractsCount,
    totalIncome, totalExpenses, netAfterExpenses,
    waqfRevenue,
    beneficiariesCount, isYearActive, sharesNote,
    yoy, collection, role,
  } = params;

  // ── ملخص التحصيل (جاهز من RPC) ──
  // paidLikeCount = paid + partially_paid (تعريف موحّد مع لوحة المستفيد)
  const collectionSummary = useMemo(() => {
    const paidCount = collection?.paid_count ?? 0;
    const partialCount = collection?.partial_count ?? 0;
    return {
      paidCount,
      partialCount,
      unpaidCount: collection?.unpaid_count ?? 0,
      paidLikeCount: paidCount + partialCount,
      total: collection?.total ?? 0,
      percentage: collection?.percentage ?? 0,
      totalCollected: collection?.total_collected ?? 0,
      totalExpected: collection?.total_expected ?? 0,
    };
  }, [collection]);

  const collectionColor = useMemo(() => getKpiColor(collectionSummary.percentage, 80, 50), [collectionSummary.percentage]);

  const stats: StatItem[] = useMemo(() => {
    const incomeChange = yoy.hasPrevYear ? calcChangePercent(totalIncome, yoy.prevTotalIncome) : null;
    const expenseChange = yoy.hasPrevYear ? calcChangePercent(totalExpenses, yoy.prevTotalExpenses) : null;
    const netChange = yoy.hasPrevYear ? calcChangePercent(netAfterExpenses, yoy.prevNetAfterExpenses) : null;

    const netCashFlow = safeNumber(waqfRevenue);

    // البطاقات التالية رُحّلت لصفحات اختصاصها — لا تُكرَّر هنا:
    //  • الإيرادات التعاقدية → /dashboard/contracts (ContractStatsCards)
    //  • المتاح للتوزيع / ريع الوقف → /dashboard/distributions
    //  • حصة الناظر / حصة الواقف → /dashboard/accounts (AccountsSummaryCards + Distribution)
    //  • نسبة التوزيع الفعلي → /dashboard/distributions (بطاقة جديدة)
    const allStats: StatItem[] = [
      { title: 'إجمالي العقارات', value: propertiesCount, icon: Building2, color: 'bg-primary', link: '/dashboard/properties' },
      { title: 'العقود النشطة', value: activeContractsCount, icon: FileText, color: 'bg-secondary', link: '/dashboard/contracts' },
      { title: 'إجمالي الدخل الفعلي', value: `${fmtInt(totalIncome)} ر.س`, icon: DollarSign, color: 'bg-primary', link: '/dashboard/income', yoyChange: incomeChange, invertColor: false },
      { title: 'إجمالي المصروفات', value: `${fmtInt(totalExpenses)} ر.س`, icon: TrendingDown, color: 'bg-destructive', link: '/dashboard/expenses', yoyChange: expenseChange, invertColor: true },
      { title: `صافي الريع${sharesNote}`, value: `${fmtInt(netAfterExpenses)} ر.س`, icon: Landmark, color: 'bg-success', link: '/dashboard/accounts', yoyChange: netChange, invertColor: false },
      { title: 'المستفيدون النشطون', value: beneficiariesCount, icon: Users, color: 'bg-muted', link: '/dashboard/beneficiaries' },
      { title: `التدفق النقدي الصافي${sharesNote}`, value: isYearActive ? 'يُحسب عند الإقفال' : `${fmtInt(netCashFlow)} ر.س`, icon: ArrowDownUp, color: netCashFlow >= 0 ? 'bg-success' : 'bg-destructive', link: '/dashboard/accounts' },
    ];

    // الفلتر يبقى كطبقة دفاع لأي بطاقات admin-only تُضاف مستقبلاً
    if (role === 'accountant') {
      return allStats.filter(s => s.visibility !== 'admin-only');
    }
    return allStats;
  }, [propertiesCount, activeContractsCount, totalIncome, totalExpenses, netAfterExpenses, waqfRevenue, beneficiariesCount, isYearActive, sharesNote, yoy, role]);

  const kpis: KpiItem[] = useMemo(() => {
    const collectionRate = collectionSummary.percentage;
    const expenseRatio = computeExpenseRatio(totalIncome, totalExpenses);
    const isFullDeficit = expenseRatio === EXPENSE_RATIO_FULL_DEFICIT;
    const isDeficit = expenseRatio > 100;

    const colColor = getKpiColor(collectionRate, 80, 50);
    // عند الـ sentinel نعرض 100% بصرياً (شريط ممتلئ بلون مدمّر)
    const expColor = getKpiColor(isFullDeficit ? 100 : expenseRatio, 20, 40, true);

    const prevExpenseRatio = yoy.hasPrevYear && yoy.prevTotalIncome > 0
      ? Math.round((yoy.prevTotalExpenses / yoy.prevTotalIncome) * 100) : null;
    const expenseRatioChange = prevExpenseRatio !== null && !isFullDeficit ? calcChangePercent(expenseRatio, prevExpenseRatio) : null;

    const hasInvoicesDue = collectionSummary.total > 0;

    return [
      { label: 'نسبة التحصيل', value: hasInvoicesDue ? collectionRate : 0, suffix: hasInvoicesDue ? '%' : '', color: hasInvoicesDue ? colColor.text : 'text-muted-foreground', progressColor: hasInvoicesDue ? colColor.bar : '' },
      {
        label: isFullDeficit ? 'عجز: إنفاق بلا دخل' : isDeficit ? 'عجز مالي' : 'نسبة المصروفات',
        value: isFullDeficit ? 100 : expenseRatio,
        suffix: '%',
        color: isDeficit ? 'text-destructive font-bold' : expColor.text,
        progressColor: isDeficit ? '[&>div]:bg-destructive' : expColor.bar,
        yoyChange: expenseRatioChange,
        invertColor: true,
      },
    ];
  }, [collectionSummary, totalIncome, totalExpenses, yoy]);

  return { stats, kpis, collectionSummary, collectionColor };
}
