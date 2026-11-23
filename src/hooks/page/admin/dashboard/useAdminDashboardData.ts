/**
 * هوك لتحضير بيانات لوحة تحكم الناظر/المحاسب — يقرأ أرقام جاهزة من RPC
 */
import { useMemo } from 'react';
import { isFyAll } from '@/constants/fiscalYearIds';
import { useAdminDashboardStats } from './useAdminDashboardStats';
import { ROLE_LABELS } from '@/constants/roles';
import { isUsingFallbackSharePct, resolveActiveContractsCount } from '@/utils/dashboard/dashboardIndicators';
import { computeExpenseRatio } from '@/utils/financial/computations/ratios';
import { buildExecutiveCards } from '@/utils/dashboard/executiveSummary';
import type { useDashboardSummary } from '@/hooks/data/financial/dashboard/useDashboardSummary';

type DashboardSummary = Omit<ReturnType<typeof useDashboardSummary>, 'isLoading'>;

/** أنواع السنة المالية المُعادة للـ UI — مفصولة عن بنية RPC */
export type DashboardFiscalYear = {
  id: string;
  label: string;
  status: string;
  start_date: string;
  end_date: string;
};

interface UseAdminDashboardDataParams {
  user: { user_metadata?: { full_name?: string }; email?: string } | null;
  role: string | null;
  fiscalYearId: string;
  fiscalYear: { label: string; status: string; start_date: string; end_date: string } | undefined;
  isSpecificYear: boolean;
  summary: DashboardSummary;
  /** عقود السنة المختارة — لعدّ النشطة بما يطابق صفحة العقود */
  yearContracts?: ReadonlyArray<{ status: string; end_date?: string | null }>;
}


export const useAdminDashboardData = ({
  user, role, fiscalYearId, fiscalYear, isSpecificYear, summary, yearContracts,
}: UseAdminDashboardDataParams) => {
  const agg = summary.aggregated;
  const totals = agg?.totals;
  const counts = agg?.counts;

  // ── قيم مالية جاهزة من RPC ──
  const totalIncome = totals?.total_income ?? 0;
  const totalExpenses = totals?.total_expenses ?? 0;
  const netAfterExpenses = totals?.net_after_expenses ?? 0;
  const netAfterZakat = totals?.net_after_zakat ?? 0;
  const adminShare = totals?.admin_share ?? 0;
  const waqifShare = totals?.waqif_share ?? 0;
  const waqfRevenue = totals?.waqf_revenue ?? 0;
  const availableAmount = totals?.available_amount ?? 0;
  const distributionsAmount = totals?.distributions_amount ?? 0;
  const contractualRevenue = totals?.contractual_revenue ?? 0;

  const pendingAdvancesCount = counts?.pending_advances ?? 0;
  // agg له الأولوية لأنه يأتي من Edge Function المحدّثة
  const isYearActive = (agg?.fiscal_year_status ?? fiscalYear?.status ?? '') === 'active';
  const sharesNote = isYearActive ? ' *تقديري' : '';

  // ── تحقق إن كانت الإعدادات تستخدم قيم افتراضية — يشمل waqf_corpus_percentage ──
  const usingFallbackPct = useMemo(() => isUsingFallbackSharePct(agg?.settings), [agg?.settings]);

  // ── أعداد العقود (من counts المُجمّعة) ──
  const expiringContractsCount = counts?.expiring_contracts ?? 0;
  const orphanedContractsCount = counts?.orphaned_contracts ?? 0;

  // ── نسبة المصروفات (لتمريرها للتنبيهات) — تكشف عجز "إنفاق بلا دخل" ──
  const expenseRatio = computeExpenseRatio(totalIncome, totalExpenses);

  // ── بيانات الرسوم البيانية (جاهزة من RPC) — تُستهلك أيضاً في Sparkline ──
  const monthlyData = agg?.monthly_data ?? [];
  const expenseTypes = agg?.expense_types ?? [];

  const activeContractsCount = resolveActiveContractsCount(yearContracts, isSpecificYear, counts?.active_contracts ?? 0);
  const isClosed = agg?.is_closed ?? (fiscalYear?.status === 'closed');

  // ── المربع المالي القيادي: أرقام الخادم كما هي بلا أي جمع أو طرح ──
  const executiveCards = useMemo(() => buildExecutiveCards({
    totals,
    isClosed,
    isAdmin: role === 'admin',
    yoy: summary.yoy,
  }), [totals, isClosed, role, summary.yoy]);

  // ── المحفظة: أعداد جاهزة من الخادم؛ الإشغال يمثل الوضع الحالي فلا يظهر للسنوات المقفلة ──
  const portfolio = useMemo(() => ({
    properties: counts?.properties ?? 0,
    activeContracts: activeContractsCount,
    beneficiaries: counts?.beneficiaries ?? 0,
    occupancy: isYearActive ? (agg?.occupancy ?? null) : null,
  }), [counts?.properties, counts?.beneficiaries, activeContractsCount, isYearActive, agg?.occupancy]);

  // ── إحصائيات البطاقات ──
  const { stats, kpis, collectionSummary, collectionColor } = useAdminDashboardStats({
    propertiesCount: counts?.properties ?? 0,
    activeContractsCount,
    contractualRevenue,
    totalIncome,
    totalExpenses,
    netAfterExpenses,
    netAfterZakat,
    availableAmount,
    adminShare,
    waqifShare,
    waqfRevenue,
    distributionsAmount,
    beneficiariesCount: counts?.beneficiaries ?? 0,
    isYearActive,
    sharesNote,
    yoy: summary.yoy,
    collection: agg?.collection ?? null,
    occupancy: agg?.occupancy ?? null,
    role,
    monthlyData,
  });

  // ── نص التحية ──
  const greetingText = useMemo(() => {
    const displayName = user?.user_metadata?.full_name
      || user?.email?.split('@')[0]
      || ROLE_LABELS[role ?? '']
      || 'المستخدم';
    const base = role === 'accountant'
      ? `مرحباً بك، ${displayName} — يمكنك إدارة الحسابات والعمليات المالية`
      : `مرحباً بك، ${displayName}`;
    return base + (isFyAll(fiscalYearId) ? ' — عرض إجمالي جميع السنوات' : '');
  }, [user, role, fiscalYearId]);

  return {
    pendingAdvancesCount,
    totalIncome,
    contractualRevenue,
    usingFallbackPct,
    expiringContractsCount,
    orphanedContractsCount,
    expenseRatio,
    stats,
    kpis,
    collectionSummary,
    collectionColor,
    monthlyData,
    expenseTypes,
    greetingText,
    allFiscalYears: (agg?.fiscal_years ?? []) as DashboardFiscalYear[],
    fiscalYear,
    isYearActive,
    isClosed,
    executiveCards,
    portfolio,
    isError: summary.isError,
  };
};
