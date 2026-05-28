/**
 * دوال نقية لتلخيص وتصفية وترتيب فواتير الدفعات.
 * مستخرجة من `usePaymentInvoicesTab` للحفاظ على حجم الهوك.
 */
import type { PaymentInvoice } from '@/types';
import { safeNumber } from '@/utils/format/safeNumber';

export type InvoiceFilterStatus = 'all' | 'pending' | 'paid' | 'overdue' | 'partially_paid';
export type SortKey = 'due_date' | 'amount' | 'status' | 'payment_number';
export type SortDir = 'asc' | 'desc';

const statusOrder: Record<string, number> = { overdue: 0, pending: 1, partially_paid: 2, paid: 3 };

export interface PaymentInvoicesSummary {
  total: number;
  paid: number;
  overdue: number;
  pending: number;
  partiallyPaid: number;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
  collectionRate: number;
}

export function summarizePaymentInvoices(invoices: PaymentInvoice[]): PaymentInvoicesSummary {
  const total = invoices.length;
  const paid = invoices.filter(i => i.status === 'paid').length;
  const overdue = invoices.filter(i => i.status === 'overdue').length;
  const pending = invoices.filter(i => i.status === 'pending').length;
  const partiallyPaid = invoices.filter(i => i.status === 'partially_paid').length;
  const totalAmount = invoices.reduce((s, i) => s + safeNumber(i.amount), 0);
  const paidAmount = invoices
    .filter(i => i.status === 'paid' || i.status === 'partially_paid')
    .reduce((s, i) => s + safeNumber(i.paid_amount ?? (i.status === 'paid' ? i.amount : 0)), 0);
  const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + safeNumber(i.amount), 0);
  const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  return { total, paid, overdue, pending, partiallyPaid, totalAmount, paidAmount, overdueAmount, collectionRate };
}

export function filterPaymentInvoices(
  invoices: PaymentInvoice[],
  filter: InvoiceFilterStatus,
  search: string,
  dateFrom: string,
  dateTo: string,
): PaymentInvoice[] {
  let result = invoices;
  if (filter === 'paid') result = result.filter(i => i.status === 'paid');
  else if (filter === 'overdue') result = result.filter(i => i.status === 'overdue');
  else if (filter === 'pending') result = result.filter(i => i.status === 'pending');
  else if (filter === 'partially_paid') result = result.filter(i => i.status === 'partially_paid');

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(i =>
      i.invoice_number.toLowerCase().includes(q) ||
      i.contract?.tenant_name?.toLowerCase().includes(q) ||
      i.contract?.contract_number?.toLowerCase().includes(q)
    );
  }
  if (dateFrom) result = result.filter(i => i.due_date >= dateFrom);
  if (dateTo) result = result.filter(i => i.due_date <= dateTo);
  return result;
}

export function sortPaymentInvoices(
  filtered: PaymentInvoice[],
  sortKey: SortKey,
  sortDir: SortDir,
): PaymentInvoice[] {
  const arr = [...filtered];
  arr.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'due_date': cmp = a.due_date.localeCompare(b.due_date); break;
      case 'amount': cmp = safeNumber(a.amount) - safeNumber(b.amount); break;
      case 'status': cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9); break;
      case 'payment_number': cmp = a.payment_number - b.payment_number; break;
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });
  return arr;
}

export function groupByContract(invoices: PaymentInvoice[]): Map<string, PaymentInvoice[]> {
  const grouped = new Map<string, PaymentInvoice[]>();
  for (const inv of invoices) {
    const key = inv.contract_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(inv);
  }
  return grouped;
}
