import { useMemo } from 'react';
import { useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useAccounts } from '@/hooks/useAccounts';
import { useBeneficiariesSafe } from '@/hooks/useBeneficiaries';
import { useAppSettings } from '@/hooks/useAppSettings';
import {
  computeTotals,
  calculateFinancials,
  groupIncomeBySource,
  groupExpensesByType,
} from '@/utils/accountsCalculations';

/**
 * Shared hook that provides unified financial data and computed values.
 * Accepts an optional fiscalYearId to filter income/expenses and match the correct account.
 * When no stored account exists for the selected year, values are calculated dynamically.
 */
export const useFinancialSummary = (fiscalYearId?: string, fiscalYearLabel?: string) => {
  const fyFilter = fiscalYearId || 'all';
  const { data: income = [] } = useIncomeByFiscalYear(fyFilter);
  const { data: expenses = [] } = useExpensesByFiscalYear(fyFilter);
  const { data: accounts = [] } = useAccounts();
  const { data: beneficiaries = [] } = useBeneficiariesSafe();
  const { data: settings } = useAppSettings();

  const { totalIncome, totalExpenses } = useMemo(
    () => computeTotals(income, expenses),
    [income, expenses],
  );

  // Find account matching the fiscal year label — NO fallback to accounts[0]
  const currentAccount = useMemo(() => {
    if (fiscalYearLabel) {
      return accounts.find(a => a.fiscal_year === fiscalYearLabel) || null;
    }
    // If no label provided but only one account exists, use it
    if (accounts.length === 1) return accounts[0];
    return null;
  }, [accounts, fiscalYearLabel]);

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

  // Expenses grouped excluding VAT entries (used by Disclosure & Financial Reports)
  const expensesByTypeExcludingVat = useMemo(() => {
    const filtered = expenses.filter(e => e.description !== 'ضريبة القيمة المضافة المحصلة من الهيئة');
    return groupExpensesByType(filtered);
  }, [expenses]);

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
    expensesByTypeExcludingVat,
  };
};
