import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuditReconciliation } from '@/hooks/data/audit/useAuditReconciliation';
import { FY_NONE } from '@/constants/fiscalYearIds';

export const useAuditTreePage = () => {
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const validId = fiscalYearId && fiscalYearId !== FY_NONE && fiscalYearId !== 'all' ? fiscalYearId : null;
  const q = useAuditReconciliation(validId, true);
  const data = q.data;
  const issues = data?.issues ?? [];
  const incomeGap = data ? Math.round((data.income_total - data.paid_invoices_total) * 100) / 100 : 0;
  return {
    yearLabel: fiscalYear?.label ?? '',
    hasYear: !!validId,
    data,
    issues,
    highCount: issues.filter(i => i.severity === 'high').length,
    incomeGap,
    isLoading: q.isLoading || q.isFetching,
    error: q.error,
    runCheck: () => q.refetch(),
  };
};
