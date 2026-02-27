import { useMemo } from 'react';
import type { Income, Expense } from '@/types/database';
import type { Tables } from '@/integrations/supabase/types';
import {
  computeTotals,
  calculateFinancials,
  groupIncomeBySource,
  groupExpensesByType,
} from '@/utils/accountsCalculations';

interface ComputedParams {
  income: Income[];
  expenses: Expense[];
  accounts: Tables<'accounts'>[];
  settings: Record<string, string> | null | undefined;
  fiscalYearLabel?: string;
  fiscalYearId?: string;
  /** Override: when true, always compute shares (used in AccountsPage) */
  forceClosedMode?: boolean;
  /** Fiscal year status */
  fiscalYearStatus?: string;
}

/**
 * Pure computation hook — derives all financial metrics from raw data.
 */
export const useComputedFinancials = ({
  income,
  expenses,
  accounts,
  settings,
  fiscalYearLabel,
  fiscalYearId,
  forceClosedMode,
  fiscalYearStatus,
}: ComputedParams) => {
  const { totalIncome, totalExpenses } = useMemo(
    () => computeTotals(income, expenses),
    [income, expenses],
  );

  const currentAccount = useMemo(() => {
    if (fiscalYearId) {
      const byId = accounts.find(a => a.fiscal_year_id === fiscalYearId);
      if (byId) return byId;
    }
    if (fiscalYearLabel) {
      return accounts.find(a => a.fiscal_year === fiscalYearLabel) || null;
    }
    if (accounts.length === 1) return accounts[0];
    return null;
  }, [accounts, fiscalYearId, fiscalYearLabel]);

  const {
    adminPct, waqifPct, zakatAmount, vatAmount,
    waqfCorpusPrevious, waqfCorpusManual, distributionsAmount,
  } = useMemo(() => {
    const adminPctRaw = settings?.admin_share_percentage
      ? parseFloat(settings.admin_share_percentage) : NaN;
    const _adminPct = Number.isFinite(adminPctRaw) ? adminPctRaw : 10;
    const waqifPctRaw = settings?.waqif_share_percentage
      ? parseFloat(settings.waqif_share_percentage) : NaN;
    const _waqifPct = Number.isFinite(waqifPctRaw) ? waqifPctRaw : 5;
    const _zakatAmount = currentAccount ? Number(currentAccount.zakat_amount || 0) : 0;
    const _vatAmount = currentAccount ? Number(currentAccount.vat_amount || 0) : 0;
    const _waqfCorpusPrevious = currentAccount ? Number(currentAccount.waqf_corpus_previous || 0) : 0;
    const _waqfCorpusManual = currentAccount ? Number(currentAccount.waqf_corpus_manual || 0) : 0;
    const _distributionsAmount = currentAccount ? Number(currentAccount.distributions_amount || 0) : 0;
    return {
      adminPct: _adminPct, waqifPct: _waqifPct, zakatAmount: _zakatAmount,
      vatAmount: _vatAmount, waqfCorpusPrevious: _waqfCorpusPrevious,
      waqfCorpusManual: _waqfCorpusManual, distributionsAmount: _distributionsAmount,
    };
  }, [settings, currentAccount]);

  // Determine if fiscal year is closed for share calculation
  const isClosed = forceClosedMode || fiscalYearStatus === 'closed';

  const financials = useMemo(() => {
    if (currentAccount) {
      const grandTotal = totalIncome + waqfCorpusPrevious;

      // If year is not closed and not forced, zero out shares
      if (!isClosed) {
        const netAfterZakat = Number(currentAccount.net_after_vat) - zakatAmount;
        return {
          grandTotal,
          netAfterExpenses: Number(currentAccount.net_after_expenses),
          netAfterVat: Number(currentAccount.net_after_vat),
          netAfterZakat,
          shareBase: totalIncome - totalExpenses - zakatAmount,
          adminShare: 0,
          waqifShare: 0,
          waqfRevenue: netAfterZakat,
          availableAmount: 0,
          remainingBalance: 0,
        };
      }

      return {
        grandTotal,
        netAfterExpenses: Number(currentAccount.net_after_expenses),
        netAfterVat: Number(currentAccount.net_after_vat),
        netAfterZakat: Number(currentAccount.net_after_vat) - zakatAmount,
        shareBase: totalIncome - totalExpenses - zakatAmount,
        adminShare: Number(currentAccount.admin_share),
        waqifShare: Number(currentAccount.waqif_share),
        waqfRevenue: Number(currentAccount.waqf_revenue),
        availableAmount: Number(currentAccount.waqf_revenue) - waqfCorpusManual,
        remainingBalance:
          Number(currentAccount.waqf_revenue) - waqfCorpusManual - distributionsAmount,
      };
    }
    return calculateFinancials({
      totalIncome,
      totalExpenses,
      waqfCorpusPrevious,
      manualVat: vatAmount,
      zakatAmount,
      adminPercent: adminPct,
      waqifPercent: waqifPct,
      waqfCorpusManual,
      manualDistributions: distributionsAmount,
      isClosed,
    });
  }, [
    currentAccount, totalIncome, totalExpenses, waqfCorpusPrevious,
    vatAmount, zakatAmount, adminPct, waqifPct, waqfCorpusManual, distributionsAmount,
    isClosed,
  ]);

  const incomeBySource = useMemo(() => groupIncomeBySource(income), [income]);
  const expensesByType = useMemo(() => groupExpensesByType(expenses), [expenses]);
  const expensesByTypeExcludingVat = useMemo(() => {
    const filtered = expenses.filter(e => e.description !== 'ضريبة القيمة المضافة المحصلة من الهيئة');
    return groupExpensesByType(filtered);
  }, [expenses]);

  // إذا كانت هناك سنة مالية محددة ولم يُعثر على الحساب الختامي
  const isAccountMissing = !currentAccount && !!fiscalYearId && fiscalYearId !== 'all';

  return {
    currentAccount,
    isAccountMissing,
    adminPct,
    waqifPct,
    totalIncome,
    totalExpenses,
    zakatAmount,
    vatAmount,
    waqfCorpusPrevious,
    waqfCorpusManual,
    distributionsAmount,
    ...financials,
    incomeBySource,
    expensesByType,
    expensesByTypeExcludingVat,
  };
};
