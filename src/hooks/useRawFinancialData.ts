import { useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useAccounts } from '@/hooks/useAccounts';
import { useBeneficiariesSafe } from '@/hooks/useBeneficiaries';
import { useAppSettings } from '@/hooks/useAppSettings';

/**
 * Fetches all raw financial data (income, expenses, accounts, beneficiaries, settings).
 * No calculations — just data retrieval and loading/error states.
 */
export const useRawFinancialData = (fiscalYearId?: string) => {
  const fyFilter = fiscalYearId || 'all';
  const { data: income = [], isLoading: incLoading, isError: incError } = useIncomeByFiscalYear(fyFilter);
  const { data: expenses = [], isLoading: expLoading, isError: expError } = useExpensesByFiscalYear(fyFilter);
  const { data: accounts = [], isLoading: accLoading, isError: accError } = useAccounts();
  const { data: beneficiaries = [], isLoading: benLoading, isError: benError } = useBeneficiariesSafe();
  const { data: settings } = useAppSettings();

  const isLoading = incLoading || expLoading || accLoading || benLoading;
  const isError = incError || expError || accError || benError;

  return { income, expenses, accounts, beneficiaries, settings, isLoading, isError };
};
