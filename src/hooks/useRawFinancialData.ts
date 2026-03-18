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
  // INT-01 fix: '__none__' is truthy, so explicit check needed
  // BUG-R2 fix: '__skip__' must map to '__none__' (not 'all') so child hooks disable their queries
  const shouldSkip = !fiscalYearId || fiscalYearId === '__none__' || fiscalYearId === '__skip__';
  const fyFilter = shouldSkip ? '__none__' : fiscalYearId;
  const { data: income = [], isLoading: incLoading, isError: incError } = useIncomeByFiscalYear(fyFilter);
  const { data: expenses = [], isLoading: expLoading, isError: expError } = useExpensesByFiscalYear(fyFilter);
  const { data: accounts = [], isLoading: accLoading, isError: accError } = useAccountByFiscalYear(fiscalYearLabel, fiscalYearId);
  const { data: beneficiaries = [], isLoading: benLoading, isError: benError } = useBeneficiariesSafe();
  const { data: settings } = useAppSettings();

  const isLoading = incLoading || expLoading || accLoading || benLoading;
  const isError = incError || expError || accError || benError;

  return { income, expenses, accounts, beneficiaries, settings, isLoading, isError };
};
