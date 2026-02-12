import { useMemo } from 'react';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { useAccounts } from '@/hooks/useAccounts';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useAppSettings } from '@/hooks/useAppSettings';
import {
  computeTotals,
  calculateFinancials,
  groupIncomeBySource,
  groupExpensesByType,
} from '@/utils/accountsCalculations';

/**
 * Shared hook that provides unified financial data and computed values.
 * Used by AdminDashboard, ReportsPage, and other read-only views.
 * AccountsPage uses its own editable state but can import calculation utilities directly.
 */
export const useFinancialSummary = () => {
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();
  const { data: accounts = [] } = useAccounts();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: settings } = useAppSettings();

  const { totalIncome, totalExpenses } = useMemo(
    () => computeTotals(income, expenses),
    [income, expenses],
  );

  const currentAccount = accounts[0] || null;
  const adminPct = settings?.admin_share_percentage
    ? parseFloat(settings.admin_share_percentage)
    : 10;
  const waqifPct = settings?.waqif_share_percentage
    ? parseFloat(settings.waqif_share_percentage)
    : 5;

  // Values from stored account or zero
  const zakatAmount = currentAccount ? Number(currentAccount.zakat_amount || 0) : 0;
  const vatAmount = currentAccount ? Number(currentAccount.vat_amount || 0) : 0;
  const waqfCorpusPrevious = currentAccount ? Number(currentAccount.waqf_corpus_previous || 0) : 0;
  const waqfCorpusManual = currentAccount ? Number(currentAccount.waqf_corpus_manual || 0) : 0;
  const distributionsAmount = currentAccount ? Number(currentAccount.distributions_amount || 0) : 0;

  // Use stored values if available, otherwise calculate dynamically
  const financials = useMemo(() => {
    if (currentAccount) {
      const grandTotal = totalIncome + waqfCorpusPrevious;
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
    });
  }, [
    currentAccount, totalIncome, totalExpenses, waqfCorpusPrevious,
    vatAmount, zakatAmount, adminPct, waqifPct, waqfCorpusManual, distributionsAmount,
  ]);

  // Grouped data
  const incomeBySource = useMemo(() => groupIncomeBySource(income), [income]);
  const expensesByType = useMemo(() => groupExpensesByType(expenses), [expenses]);

  return {
    // Raw data
    income,
    expenses,
    accounts,
    beneficiaries,
    currentAccount,
    // Settings
    adminPct,
    waqifPct,
    // Totals
    totalIncome,
    totalExpenses,
    // Stored manual values
    zakatAmount,
    vatAmount,
    waqfCorpusPrevious,
    waqfCorpusManual,
    distributionsAmount,
    // Calculated financial hierarchy
    ...financials,
    // Grouped
    incomeBySource,
    expensesByType,
  };
};
