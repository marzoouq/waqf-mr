/**
 * فلترة وترتيب وتصفح فواتير الدفعات
 * مستخرج من usePaymentInvoicesTab لتقليل حجم الملف
 */
import { useMemo, useState, useEffect } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import type { PaymentInvoice } from '@/hooks/data/usePaymentInvoices';

export type FilterStatus = 'all' | 'pending' | 'paid' | 'overdue' | 'partially_paid';
export type SortKey = 'due_date' | 'amount' | 'status' | 'payment_number';
export type SortDir = 'asc' | 'desc';

const statusOrder: Record<string, number> = { overdue: 0, pending: 1, partially_paid: 2, paid: 3 };

export const usePaymentInvoicesFilters = (invoices: PaymentInvoice[]) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const ITEMS_PER_PAGE = 15;

  useEffect(() => { setCurrentPage(1); }, [filter, search, dateFrom, dateTo]);

  const summary = useMemo(() => {
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
  }, [invoices]);

  const filtered = useMemo(() => {
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
  }, [invoices, filter, search, dateFrom, dateTo]);

  const sorted = useMemo(() => {
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
  }, [filtered, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  const groupedPaginated = useMemo(() => {
    const grouped = new Map<string, PaymentInvoice[]>();
    for (const inv of paginated) {
      const key = inv.contract_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(inv);
    }
    return grouped;
  }, [paginated]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const unpaidFiltered = useMemo(() => sorted.filter(i => i.status !== 'paid'), [sorted]);

  return {
    summary, sorted, groupedPaginated, unpaidFiltered, ITEMS_PER_PAGE,
    search, setSearch, filter, setFilter,
    dateFrom, setDateFrom, dateTo, setDateTo,
    sortKey, sortDir, toggleSort,
    currentPage, setCurrentPage,
  };
};
