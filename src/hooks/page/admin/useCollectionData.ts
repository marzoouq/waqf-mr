/**
 * هوك حساب بيانات تقرير التحصيل — الصفوف والملخص والفلترة
 */
import { useMemo, useState } from 'react';
import type { Contract } from '@/types/database';
import type { FiscalYear } from '@/hooks/financial/useFiscalYears';
import type { PaymentInvoice } from '@/hooks/data/invoices/usePaymentInvoices';
import { allocateContractToFiscalYears } from '@/utils/contractAllocation';
import { getPaymentCount } from '@/utils/contractHelpers';
import { safeNumber } from '@/utils/safeNumber';

// ─── الأنواع ───
export type FilterStatus = 'all' | 'overdue' | 'partial' | 'complete';

export interface CollectionRow {
  contract: Contract;
  paymentCount: number;
  totalContractPayments: number;
  spansMultipleYears: boolean;
  paid: number;
  expected: number;
  overdue: number;
  overdueAmount: number;
  collectedAmount: number;
  totalAmount: number;
  paymentAmount: number;
  status: 'complete' | 'partial' | 'overdue' | 'not_started';
}

export interface CollectionSummary {
  totalExpected: number;
  totalCollected: number;
  totalOverdue: number;
  overdueCount: number;
  completeCount: number;
  collectionRate: number;
  total: number;
}

/**
 * @deprecated تُستخدم فقط كـ fallback عند عرض "جميع السنوات".
 */
function getExpectedPaymentsFallback(contract: Contract): number {
  const start = new Date(contract.start_date);
  const end = new Date(contract.end_date);
  const now = new Date();
  if (now < start) return 0;

  const paymentCount = getPaymentCount(contract);
  const contractDurationMonths = Math.max(1, Math.round(
    (end.getTime() - start.getTime()) / (1000 * 3600 * 24 * 30.44)
  ));

  if (contract.payment_type === 'monthly') {
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.min(Math.max(0, months), contractDurationMonths);
  }

  if (contract.payment_type === 'annual') {
    const monthsSinceStart = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return monthsSinceStart >= 1 ? 1 : 0;
  }

  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 3600 * 24));
  return Math.min(Math.floor(paymentCount * elapsedDays / totalDays), paymentCount);
}

// ─── الهوك ───
interface UseCollectionDataParams {
  contracts: Contract[];
  paymentInvoices: PaymentInvoice[];
  fiscalYears: FiscalYear[];
  fiscalYearId: string;
}

export function useCollectionData({ contracts, paymentInvoices, fiscalYears, fiscalYearId }: UseCollectionDataParams) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
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

  const rows: CollectionRow[] = useMemo(() => {
    return relevantContracts.map(contract => {
      const contractPaymentCount = getPaymentCount(contract);
      const perPayment = contract.payment_amount || (safeNumber(contract.rent_amount) / contractPaymentCount);
      const paid = invoicePaidMap.get(contract.id) ?? 0;

      let allocatedPayments: number;
      let allocatedAmount: number;

      if (useDynamicAllocation) {
        const allocations = allocateContractToFiscalYears(
          {
            id: contract.id,
            start_date: contract.start_date,
            end_date: contract.end_date,
            rent_amount: safeNumber(contract.rent_amount),
            payment_type: contract.payment_type,
            payment_count: contract.payment_count,
            payment_amount: contract.payment_amount ?? undefined,
          },
          fiscalYears
        );
        const fyAlloc = allocations.find(a => a.fiscal_year_id === fiscalYearId);
        allocatedPayments = fyAlloc?.allocated_payments ?? 0;
        allocatedAmount = fyAlloc?.allocated_amount ?? 0;
      } else {
        allocatedPayments = contractPaymentCount;
        allocatedAmount = safeNumber(contract.rent_amount);
      }

      const expected = useDynamicAllocation ? allocatedPayments : getExpectedPaymentsFallback(contract);
      const overdue = Math.max(0, expected - paid);
      const overdueAmount = overdue * perPayment;
      const collectedAmount = paid * perPayment;

      let status: CollectionRow['status'];
      if (allocatedPayments > 0 && paid >= allocatedPayments) status = 'complete';
      else if (overdue > 0) status = 'overdue';
      else if (paid > 0) status = 'partial';
      else status = 'not_started';

      const contractPaymentCountTotal = getPaymentCount(contract);
      const spansMultipleYears = useDynamicAllocation && allocatedPayments < contractPaymentCountTotal;

      return {
        contract,
        paymentCount: allocatedPayments,
        totalContractPayments: contractPaymentCountTotal,
        spansMultipleYears,
        paid,
        expected,
        overdue,
        overdueAmount,
        collectedAmount,
        totalAmount: allocatedAmount,
        paymentAmount: perPayment,
        status,
      };
    });
  }, [relevantContracts, invoicePaidMap, useDynamicAllocation, fiscalYears, fiscalYearId]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (filter === 'overdue') result = result.filter(r => r.overdue > 0);
    else if (filter === 'partial') result = result.filter(r => r.status === 'partial');
    else if (filter === 'complete') result = result.filter(r => r.status === 'complete');

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.contract.contract_number.toLowerCase().includes(q) ||
        r.contract.tenant_name.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => b.overdue - a.overdue);
  }, [rows, filter, search]);

  const summary: CollectionSummary = useMemo(() => {
    const totalExpected = rows.reduce((s, r) => s + r.totalAmount, 0);
    const totalCollected = rows.reduce((s, r) => s + r.collectedAmount, 0);
    const totalOverdue = rows.reduce((s, r) => s + r.overdueAmount, 0);
    const overdueCount = rows.filter(r => r.overdue > 0).length;
    const completeCount = rows.filter(r => r.status === 'complete').length;
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
    return { totalExpected, totalCollected, totalOverdue, overdueCount, completeCount, collectionRate, total: rows.length };
  }, [rows]);

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
