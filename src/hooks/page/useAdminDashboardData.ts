/**
 * هوك يجمع الحسابات المشتقة للوحة التحكم الإدارية
 * مستخرج من AdminDashboard لتقليل حجم المكون
 */
import { useMemo } from 'react';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { safeNumber } from '@/utils/safeNumber';
import { computeMonthlyData } from '@/utils/dashboardComputations';
import { useComputedFinancials } from '@/hooks/financial/useComputedFinancials';
import { useDashboardSummary } from '@/hooks/page/useDashboardSummary';
import { useAdminDashboardStats } from '@/hooks/page/useAdminDashboardStats';

interface UseDashboardDataParams {
  fiscalYearId: string;
  fiscalYear: { label?: string; start_date?: string; end_date?: string; status?: string } | null;
  isSpecificYear: boolean;
  role: string | null;
  userDisplayName: string;
}

export function useAdminDashboardData({
  fiscalYearId, fiscalYear, isSpecificYear, role, userDisplayName,
}: UseDashboardDataParams) {
  const {
    properties, contracts, allUnits, paymentInvoices,
    contractAllocations, advanceRequests, orphanedContracts,
    income, expenses, accounts, beneficiaries, settings,
    allFiscalYears, yoy,
    isLoading,
  } = useDashboardSummary(fiscalYearId, fiscalYear?.label);

  const pendingAdvancesCount = useMemo(
    () => advanceRequests.filter(r => r.status === 'pending').length,
    [advanceRequests],
  );

  const computedAccounts = useMemo(
    () => accounts.map(a => ({ ...a, fiscal_year_id: a.fiscal_year_id ?? '' })),
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

  const relevantContracts = useMemo(
    () => isSpecificYear ? contracts : contracts.filter(c => c.status === 'active'),
    [contracts, isSpecificYear],
  );

  const activeContractsCount = relevantContracts.length;

  const contractualRevenue = useMemo(() => {
    if (isSpecificYear && contractAllocations.length > 0) {
      const allocMap = new Map<string, number>();
      contractAllocations.forEach(a => {
        allocMap.set(a.contract_id, (allocMap.get(a.contract_id) ?? 0) + safeNumber(a.allocated_amount));
      });
      return relevantContracts.reduce((sum, c) => sum + (allocMap.get(c.id) ?? 0), 0);
    }
    return relevantContracts.reduce((sum, c) => sum + safeNumber(c.rent_amount), 0);
  }, [relevantContracts, contractAllocations, isSpecificYear]);

  const isYearActive = fiscalYear?.status === 'active';
  const sharesNote = isYearActive ? ' *تقديري' : '';

  const expiringContracts = useMemo(() =>
    contracts.filter(c => {
      const daysLeft = (new Date(c.end_date).getTime() - Date.now()) / 86_400_000;
      return c.status === 'active' && daysLeft >= 0 && daysLeft <= EXPIRING_SOON_DAYS;
    }),
    [contracts],
  );

  const { stats, kpis, collectionSummary, collectionColor } = useAdminDashboardStats({
    properties, activeContractsCount, contractualRevenue,
    totalIncome, totalExpenses, netAfterExpenses, netAfterZakat,
    availableAmount, adminShare: adminShare ?? 0, waqifShare: waqifShare ?? 0, waqfRevenue: waqfRevenue ?? 0,
    distributionsAmount, beneficiaries, isYearActive, sharesNote,
    yoy, contracts, paymentInvoices, allUnits, isSpecificYear,
  });

  const monthlyData = useMemo(() => computeMonthlyData(income, expenses), [income, expenses]);

  const expenseTypes = useMemo(() => {
    const types: Record<string, number> = {};
    expenses.forEach(item => {
      const type = item.expense_type || 'أخرى';
      types[type] = (types[type] || 0) + safeNumber(item.amount);
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const greetingText = useMemo(() => {
    const base = role === 'accountant'
      ? `مرحباً بك، ${userDisplayName} — يمكنك إدارة الحسابات والعمليات المالية`
      : `مرحباً بك، ${userDisplayName}`;
    return base + (fiscalYearId === 'all' ? ' — عرض إجمالي جميع السنوات' : fiscalYear ? ` — ${fiscalYear.label}` : '');
  }, [userDisplayName, role, fiscalYearId, fiscalYear]);

  return {
    isLoading,
    usingFallbackPct,
    expiringContracts,
    orphanedContracts,
    pendingAdvancesCount,
    collectionSummary,
    collectionColor,
    stats,
    kpis,
    fiscalYear,
    totalIncome,
    contractualRevenue,
    contracts,
    paymentInvoices,
    advanceRequests,
    allFiscalYears,
    monthlyData,
    expenseTypes,
    greetingText,
  };
}
