/**
 * هوك إدارة حالة تبويب فواتير الدفعات — orchestrator
 * المنطق مُستخرَج في:
 *   - usePaymentInvoicesFilters (فلترة وترتيب وتصفح)
 *   - usePaymentInvoicesActions (دفع ومعاينة وتحديد جماعي)
 */
import { usePaymentInvoices, useGenerateAllInvoices } from '@/hooks/data/usePaymentInvoices';
import { useContractsByFiscalYear } from '@/hooks/data/useContracts';
import { usePaymentInvoicesFilters, type FilterStatus, type SortKey, type SortDir } from './usePaymentInvoicesFilters';
import { usePaymentInvoicesActions } from './usePaymentInvoicesActions';

// إعادة تصدير الأنواع للتوافقية
export type { FilterStatus, SortKey, SortDir };

export const usePaymentInvoicesTab = (fiscalYearId: string) => {
  const { data: invoices = [], isLoading } = usePaymentInvoices(fiscalYearId);
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const generateAll = useGenerateAllInvoices();

  // فلترة وترتيب وتصفح
  const filtersResult = usePaymentInvoicesFilters(invoices);

  // عمليات الدفع والمعاينة
  const actionsResult = usePaymentInvoicesActions(contracts);

  // toggleSelectAll يحتاج unpaidFiltered من الفلاتر
  const toggleSelectAll = () => actionsResult.toggleSelectAllFor(filtersResult.unpaidFiltered);

  return {
    isLoading, invoices,
    ...filtersResult,
    ...actionsResult,
    toggleSelectAll,
    generateAll,
  };
};
