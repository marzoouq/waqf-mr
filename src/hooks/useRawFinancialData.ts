import { useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useAccountByFiscalYear } from '@/hooks/useAccounts';
import { useBeneficiariesSafe } from '@/hooks/useBeneficiaries';
import { useAppSettings } from '@/hooks/useAppSettings';

/**
 * Fetches all raw financial data (income, expenses, accounts, beneficiaries, settings).
 * No calculations — just data retrieval and loading/error states.
 * Now accepts optional fiscalYearLabel for server-side account filtering.
 */
export const useRawFinancialData = (fiscalYearId?: string, fiscalYearLabel?: string) => {
  const fyFilter = fiscalYearId || 'all';
  const { data: income = [], isLoading: incLoading, isError: incError } = useIncomeByFiscalYear(fyFilter);
  const { data: expenses = [], isLoading: expLoading, isError: expError } = useExpensesByFiscalYear(fyFilter);
  const { data: accounts = [], isLoading: accLoading, isError: accError } = useAccountByFiscalYear(fiscalYearLabel);
  const { data: beneficiaries = [], isLoading: benLoading, isError: benError } = useBeneficiariesSafe();
  const { data: settings } = useAppSettings();

  const isLoading = incLoading || expLoading || accLoading || benLoading;
  const isError = incError || expError || accError || benError;

  return { income, expenses, accounts, beneficiaries, settings, isLoading, isError };
};
