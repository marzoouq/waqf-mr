import { useIncomeByFiscalYear } from '@/hooks/data/financial/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/useExpenses';
import { useAccountByFiscalYear } from '@/hooks/financial/useAccounts';
import { useBeneficiariesSafe } from '@/hooks/data/beneficiaries/useBeneficiaries';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { FY_NONE, FY_SKIP, isFyReady } from '@/constants/fiscalYearIds';

/**
 * Fetches all raw financial data (income, expenses, accounts, beneficiaries, settings).
 * No calculations — just data retrieval and loading/error states.
 * Now accepts optional fiscalYearLabel for server-side account filtering.
 */
export const useRawFinancialData = (fiscalYearId?: string, fiscalYearLabel?: string) => {
  // القيمة الخاصة تحتاج فحصاً صريحاً
  // تحويل __skip__ إلى __none__ لتعطيل الاستعلامات الفرعية
  const shouldSkip = !fiscalYearId || !isFyReady(fiscalYearId) || fiscalYearId === FY_SKIP;
  const fyFilter = shouldSkip ? FY_NONE : fiscalYearId;
  const { data: income = [], isLoading: incLoading, isError: incError } = useIncomeByFiscalYear(fyFilter);
  const { data: expenses = [], isLoading: expLoading, isError: expError } = useExpensesByFiscalYear(fyFilter);
  // تمرير القيمة المعقّمة لمنع وصول قيمة غير صالحة كـ UUID
  const { data: accounts = [], isLoading: accLoading, isError: accError } = useAccountByFiscalYear(
    shouldSkip ? undefined : fiscalYearLabel,
    fyFilter,
  );
  const { data: beneficiaries = [], isLoading: benLoading, isError: benError } = useBeneficiariesSafe();
  const { data: settings } = useAppSettings();

  const isLoading = incLoading || expLoading || accLoading || benLoading;
  const isError = incError || expError || accError || benError;

  return { income, expenses, accounts, beneficiaries, settings, isLoading, isError };
};
