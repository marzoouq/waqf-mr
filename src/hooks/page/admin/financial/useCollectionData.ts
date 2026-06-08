/**
 * هوك حساب بيانات تقرير التحصيل — الصفوف والملخص والفلترة
 * منطق الحساب النقي في `utils/financial/collectionCompute.ts`.
 */
import { useMemo, useState } from 'react';
import type { Contract } from '@/types';
import type { FiscalYear } from '@/hooks/data/financial/fiscalYears/useFiscalYears';
import type { PaymentInvoice } from '@/hooks/data/invoices/usePaymentInvoices';
import {
  buildCollectionRow,
  filterCollectionRows,
  summarizeCollection,
  type CollectionFilterStatus,
  type CollectionRow,
  type CollectionSummary,
} from '@/utils/financial/collection/collectionCompute';

export type { CollectionFilterStatus, CollectionRow, CollectionSummary };

interface UseCollectionDataParams {
  contracts: Contract[];
  paymentInvoices: PaymentInvoice[];
  fiscalYears: FiscalYear[];
  fiscalYearId: string;
  /** بداية السنة المالية الحالية. null في وضع "كل السنوات" — يُعطّل تصنيف المتأخر حسب السنة. */
  fiscalYearStart?: string | null;
}

export function useCollectionData({ contracts, paymentInvoices, fiscalYears, fiscalYearId, fiscalYearStart = null }: UseCollectionDataParams) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CollectionFilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const useDynamicAllocation = fiscalYearId !== 'all' && fiscalYears.length > 0;

  const invoicePaidMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of paymentInvoices) {
      if (inv.status === 'paid') {
        map.set(inv.contract_id, (map.get(inv.contract_id) ?? 0) + 1);
      }
    }
    return map;
  }, [paymentInvoices]);

  const contractsWithUnpaidInvoices = useMemo(() => {
    const ids = new Set<string>();
    for (const inv of paymentInvoices) {
      if (inv.status !== 'paid') ids.add(inv.contract_id);
    }
    return ids;
  }, [paymentInvoices]);

  const relevantContracts = useMemo(() => contracts.filter(c =>
    c.status === 'active' || contractsWithUnpaidInvoices.has(c.id)
  ), [contracts, contractsWithUnpaidInvoices]);

  const rows: CollectionRow[] = useMemo(
    () => relevantContracts.map(c =>
      buildCollectionRow(c, invoicePaidMap.get(c.id) ?? 0, fiscalYears, fiscalYearId, useDynamicAllocation)
    ),
    [relevantContracts, invoicePaidMap, useDynamicAllocation, fiscalYears, fiscalYearId],
  );

  const filteredRows = useMemo(
    () => filterCollectionRows(rows, filter, search),
    [rows, filter, search],
  );

  const summary: CollectionSummary = useMemo(
    () => summarizeCollection(rows, paymentInvoices, fiscalYearStart),
    [rows, paymentInvoices, fiscalYearStart],
  );

  return {
    rows,
    filteredRows,
    summary,
    filter,
    setFilter,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    useDynamicAllocation,
  };
}
