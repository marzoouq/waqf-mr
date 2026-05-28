/**
 * دوال نقية لحساب صفوف وملخص تقرير التحصيل.
 * مستخرَجة من `useCollectionData` لتقليل حجم الهوك مع الإبقاء على السلوك.
 */
import type { Contract, FiscalYear } from '@/types';
import { allocateContractToFiscalYears } from '@/utils/financial/contractAllocation';
import { getPaymentCount } from '@/utils/financial/contractHelpers';
import { safeNumber } from '@/utils/format/safeNumber';

export type CollectionFilterStatus = 'all' | 'overdue' | 'partial' | 'complete';

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
  /** متأخرات استحقاقها داخل السنة المالية الحالية. 0 في وضع "كل السنوات". */
  overdueInYearAmount: number;
  overdueInYearCount: number;
  /** متأخرات استحقاقها قبل بداية السنة المالية الحالية. 0 في وضع "كل السنوات". */
  overdueFromPreviousAmount: number;
  overdueFromPreviousCount: number;
}

/** دفعة فاتورة مبسّطة لاحتياج تصنيف المتأخر حسب سنة الاستحقاق. */
export interface OverdueInvoiceLite {
  due_date: string;
  status: string;
  amount: number;
}

/** عدد الدفعات المتوقعة كـ fallback عند عرض "جميع السنوات". */
export function getExpectedPaymentsFallback(contract: Contract): number {
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

/** يبني صف تحصيل واحد. */
export function buildCollectionRow(
  contract: Contract,
  paidCount: number,
  fiscalYears: FiscalYear[],
  fiscalYearId: string,
  useDynamicAllocation: boolean,
): CollectionRow {
  const contractPaymentCount = getPaymentCount(contract);
  const perPayment = contract.payment_amount || (safeNumber(contract.rent_amount) / contractPaymentCount);

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
      fiscalYears,
    );
    const fyAlloc = allocations.find(a => a.fiscal_year_id === fiscalYearId);
    allocatedPayments = fyAlloc?.allocated_payments ?? 0;
    allocatedAmount = fyAlloc?.allocated_amount ?? 0;
  } else {
    allocatedPayments = contractPaymentCount;
    allocatedAmount = safeNumber(contract.rent_amount);
  }

  const expected = useDynamicAllocation ? allocatedPayments : getExpectedPaymentsFallback(contract);
  const overdue = Math.max(0, expected - paidCount);
  const overdueAmount = overdue * perPayment;
  const collectedAmount = paidCount * perPayment;

  let status: CollectionRow['status'];
  if (allocatedPayments > 0 && paidCount >= allocatedPayments) status = 'complete';
  else if (overdue > 0) status = 'overdue';
  else if (paidCount > 0) status = 'partial';
  else status = 'not_started';

  const spansMultipleYears = useDynamicAllocation && allocatedPayments < contractPaymentCount;

  return {
    contract,
    paymentCount: allocatedPayments,
    totalContractPayments: contractPaymentCount,
    spansMultipleYears,
    paid: paidCount,
    expected,
    overdue,
    overdueAmount,
    collectedAmount,
    totalAmount: allocatedAmount,
    paymentAmount: perPayment,
    status,
  };
}

/** يطبّق الفلتر والبحث على الصفوف. */
export function filterCollectionRows(
  rows: CollectionRow[],
  filter: CollectionFilterStatus,
  search: string,
): CollectionRow[] {
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
  return [...result].sort((a, b) => b.overdue - a.overdue);
}

/** يحسب الملخص الإجمالي. يُمرَّر `invoices` و`fiscalYearStart` لتصنيف المتأخر حسب سنة الاستحقاق. */
export function summarizeCollection(
  rows: CollectionRow[],
  invoices: OverdueInvoiceLite[] = [],
  fiscalYearStart: string | null = null,
): CollectionSummary {
  const totalExpected = rows.reduce((s, r) => s + r.totalAmount, 0);
  const totalCollected = rows.reduce((s, r) => s + r.collectedAmount, 0);
  const totalOverdue = rows.reduce((s, r) => s + r.overdueAmount, 0);
  const overdueCount = rows.filter(r => r.overdue > 0).length;
  const completeCount = rows.filter(r => r.status === 'complete').length;
  const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  let overdueInYearAmount = 0, overdueInYearCount = 0;
  let overdueFromPreviousAmount = 0, overdueFromPreviousCount = 0;
  if (fiscalYearStart) {
    const today = new Date().toISOString().slice(0, 10);
    for (const inv of invoices) {
      if (inv.status === 'paid') continue;
      if (inv.due_date < fiscalYearStart) {
        overdueFromPreviousAmount += safeNumber(inv.amount);
        overdueFromPreviousCount++;
      } else if (inv.due_date <= today) {
        overdueInYearAmount += safeNumber(inv.amount);
        overdueInYearCount++;
      }
    }
  }

  return {
    totalExpected, totalCollected, totalOverdue, overdueCount, completeCount, collectionRate,
    total: rows.length,
    overdueInYearAmount, overdueInYearCount,
    overdueFromPreviousAmount, overdueFromPreviousCount,
  };
}
