/**
 * هوك لتحضير بيانات لوحة تحكم الناظر/المحاسب — يقرأ أرقام جاهزة من RPC
 */
import { useMemo } from 'react';
import { isFyAll } from '@/constants/fiscalYearIds';
import { useAdminDashboardStats } from './useAdminDashboardStats';
import { ROLE_LABELS } from '@/constants/roles';
import type { useDashboardSummary } from '@/hooks/data/financial/useDashboardSummary';

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
}


export const useAdminDashboardData = ({
  user, role, fiscalYearId, fiscalYear, isSpecificYear: _isSpecificYear, summary,
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
  const usingFallbackPct = useMemo(() => {
    const s = agg?.settings;
    if (!s) return false;
    const adminPct = s.admin_share_percentage;
    const waqifPct = s.waqif_share_percentage;
    const corpusPct = s.waqf_corpus_percentage;
    return (
      adminPct === null || adminPct === undefined ||
      waqifPct === null || waqifPct === undefined ||
      corpusPct === null || corpusPct === undefined
    );
  }, [agg?.settings]);

  // ── أعداد العقود (من counts المُجمّعة) ──
  const expiringContractsCount = counts?.expiring_contracts ?? 0;
  const orphanedContractsCount = counts?.orphaned_contracts ?? 0;

  // ── نسبة المصروفات (لتمريرها للتنبيهات) ──
  const expenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

  // ── إحصائيات البطاقات ──
  const { stats, kpis, collectionSummary, collectionColor } = useAdminDashboardStats({
    propertiesCount: counts?.properties ?? 0,
    activeContractsCount: counts?.active_contracts ?? 0,
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
  });

  // ── بيانات الرسوم البيانية (جاهزة من RPC) ──
  const monthlyData = agg?.monthly_data ?? [];
  const expenseTypes = agg?.expense_types ?? [];

  // ── نص التحية ──
  const greetingText = useMemo(() => {
    const displayName = user?.user_metadata?.full_name
      || user?.email?.split('@')[0]
      || ROLE_LABELS[role ?? '']
      || 'المستخدم';
    const base = role === 'accountant'
      ? `مرحباً بك، ${displayName} — يمكنك إدارة الحسابات والعمليات المالية`
      : `مرحباً بك، ${displayName}`;
    return base + (isFyAll(fiscalYearId) ? ' — عرض إجمالي جميع السنوات' : fiscalYear ? ` — ${fiscalYear.label}` : '');
  }, [user, role, fiscalYearId, fiscalYear]);

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
    isError: summary.isError,
  };
};
