/**
 * هوك لتحضير بيانات لوحة تحكم الناظر/المحاسب — يفصل منطق الحساب عن العرض
 */
import { useMemo } from 'react';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { safeNumber } from '@/utils/safeNumber';
import { computeMonthlyData } from '@/utils/dashboardComputations';
import { useComputedFinancials } from '@/hooks/financial/useComputedFinancials';
import { useAdminDashboardStats } from '@/hooks/page/useAdminDashboardStats';
import type { useDashboardSummary } from '@/hooks/data/financial/useDashboardSummary';

/** النوع المُستنتج من هوك الملخص — يضمن التوافق التام بين الهوكين */
type DashboardSummary = Omit<ReturnType<typeof useDashboardSummary>, 'isLoading' | 'isError'>;

interface UseAdminDashboardDataParams {
  user: { user_metadata?: { full_name?: string }; email?: string } | null;
  role: string | null;
  fiscalYearId: string;
  fiscalYear: { label: string; status: string; start_date: string; end_date: string } | undefined;
  isSpecificYear: boolean;
  summary: DashboardSummary;
}

export const useAdminDashboardData = ({
  user, role, fiscalYearId, fiscalYear, isSpecificYear, summary,
}: UseAdminDashboardDataParams) => {
  const {
    properties, contracts, allUnits, paymentInvoices,
    contractAllocations, advanceRequests, orphanedContracts,
    income, expenses, accounts, beneficiaries, settings,
    allFiscalYears, yoy,
  } = summary;

  // ── عدد السلف المعلقة ──
  const pendingAdvancesCount = useMemo(
    () => advanceRequests.filter((r) => r.status === 'pending').length,
    [advanceRequests],
  );

  // ── الحسابات المالية ──
  const computedAccounts = useMemo(
    () => accounts.map((a) => ({ ...a, fiscal_year_id: a.fiscal_year_id ?? '' })),
    [accounts],
  );
  const {
    totalIncome, totalExpenses, adminShare, waqifShare, waqfRevenue,
    netAfterExpenses, netAfterZakat, availableAmount,
    zakatAmount: _zakatAmount, distributionsAmount, usingFallbackPct,
  } = useComputedFinancials({
    income, expenses, accounts: computedAccounts, settings,
    fiscalYearLabel: fiscalYear?.label,
    fiscalYearId,
    fiscalYearStatus: fiscalYear?.status,
  });

  // ── العقود والإيرادات التعاقدية ──
  const relevantContracts = useMemo(
    () => isSpecificYear ? contracts : contracts.filter((c) => c.status === 'active'),
    [contracts, isSpecificYear],
  );
  const activeContractsCount = relevantContracts.length;

  const contractualRevenue = useMemo(() => {
    if (isSpecificYear && contractAllocations.length > 0) {
      const allocMap = new Map<string, number>();
      contractAllocations.forEach((a) => {
        allocMap.set(a.contract_id, (allocMap.get(a.contract_id) ?? 0) + safeNumber(a.allocated_amount));
      });
      return relevantContracts.reduce((sum: number, c) => sum + (allocMap.get(c.id) ?? 0), 0);
    }
    return relevantContracts.reduce((sum: number, c) => sum + safeNumber(c.rent_amount), 0);
  }, [relevantContracts, contractAllocations, isSpecificYear]);

  const isYearActive = fiscalYear?.status === 'active';
  const sharesNote = isYearActive ? ' *تقديري' : '';

  // ── العقود المنتهية قريباً ──
  const expiringContracts = useMemo(() =>
    contracts.filter((c) => {
      const daysLeft = (new Date(c.end_date).getTime() - Date.now()) / 86_400_000;
      return c.status === 'active' && daysLeft >= 0 && daysLeft <= EXPIRING_SOON_DAYS;
    }),
    [contracts],
  );

  // ── إحصائيات البطاقات ──
  const { stats, kpis, collectionSummary, collectionColor } = useAdminDashboardStats({
    properties, activeContractsCount, contractualRevenue,
    totalIncome, totalExpenses, netAfterExpenses, netAfterZakat,
    availableAmount, adminShare: adminShare ?? 0, waqifShare: waqifShare ?? 0, waqfRevenue: waqfRevenue ?? 0,
    distributionsAmount, beneficiaries, isYearActive, sharesNote,
    yoy, contracts, paymentInvoices, allUnits, isSpecificYear,
  });

  // ── بيانات الرسوم البيانية ──
  const monthlyData = useMemo(() => computeMonthlyData(income, expenses), [income, expenses]);

  const expenseTypes = useMemo(() => {
    const types: Record<string, number> = {};
    expenses.forEach((item) => {
      const type = item.expense_type || 'أخرى';
      types[type] = (types[type] || 0) + safeNumber(item.amount);
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // ── نص التحية ──
  const greetingText = useMemo(() => {
    const displayName = user?.user_metadata?.full_name
      || user?.email?.split('@')[0]
      || (role === 'accountant' ? 'المحاسب' : 'ناظر الوقف');
    const base = role === 'accountant'
      ? `مرحباً بك، ${displayName} — يمكنك إدارة الحسابات والعمليات المالية`
      : `مرحباً بك، ${displayName}`;
    return base + (fiscalYearId === 'all' ? ' — عرض إجمالي جميع السنوات' : fiscalYear ? ` — ${fiscalYear.label}` : '');
  }, [user, role, fiscalYearId, fiscalYear]);

  return {
    pendingAdvancesCount, totalIncome, contractualRevenue,
    usingFallbackPct, expiringContracts, orphanedContracts,
    stats, kpis, collectionSummary, collectionColor,
    monthlyData, expenseTypes, greetingText,
    contracts, paymentInvoices, advanceRequests, allFiscalYears,
    fiscalYear, isYearActive,
  };
};
