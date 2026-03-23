/**
 * Unified financial summary hook — composes useRawFinancialData + useComputedFinancials.
 * This remains the single entry-point used across all pages for backward compatibility.
 */
import { useRawFinancialData } from '@/hooks/useRawFinancialData';
import { useComputedFinancials } from '@/hooks/useComputedFinancials';

export { useRawFinancialData } from '@/hooks/useRawFinancialData';
export { useComputedFinancials } from '@/hooks/useComputedFinancials';

export const useFinancialSummary = (fiscalYearId?: string, fiscalYearLabel?: string, opts?: { forceClosedMode?: boolean; fiscalYearStatus?: string }) => {
  const { income, expenses, accounts, beneficiaries, settings, isLoading, isError } =
    useRawFinancialData(fiscalYearId, fiscalYearLabel);

  const computed = useComputedFinancials({
    income,
    expenses,
    accounts,
    settings,
    fiscalYearLabel,
    fiscalYearId,
    forceClosedMode: opts?.forceClosedMode,
    fiscalYearStatus: opts?.fiscalYearStatus,
  });

  return {
    isLoading,
    isError,
    income,
    expenses,
    accounts,
    beneficiaries,
    ...computed,
  };
};
