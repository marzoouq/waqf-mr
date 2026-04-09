/**
 * هوك إدارة حالة تبويب فواتير الدفعات — orchestrator
 * تم استخراج إجراءات الدفع إلى usePaymentInvoiceActions (#22)
 */
import { useMemo, useState, useEffect } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import {
  type PaymentInvoice,
  usePaymentInvoices,
  useGenerateAllInvoices,
} from '@/hooks/data/invoices/usePaymentInvoices';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import type { InvoicePreviewData } from '@/types/invoices';
import { usePaymentInvoiceActions } from './usePaymentInvoiceActions';

import type { SortDir } from '@/types/sorting';

export type InvoiceFilterStatus = 'all' | 'pending' | 'paid' | 'overdue' | 'partially_paid';
export type SortKey = 'due_date' | 'amount' | 'status' | 'payment_number';

const statusOrder: Record<string, number> = { overdue: 0, pending: 1, partially_paid: 2, paid: 3 };

const ITEMS_PER_PAGE = 15;

export const usePaymentInvoicesTab = (fiscalYearId: string) => {
  const { data: invoices = [], isLoading } = usePaymentInvoices(fiscalYearId);
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const generateAll = useGenerateAllInvoices();
  const waqfInfo = usePdfWaqfInfo();

  // إجراءات الدفع — مُستخرجة (#22)
  const actions = usePaymentInvoiceActions();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreviewData | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  const buildPaymentPreviewData = (inv: PaymentInvoice): InvoicePreviewData => {
    const fullContract = contracts.find(c => c.id === inv.contract_id);
    const hasBuyerTax = !!fullContract?.tenant_tax_number;
    const hasVat = safeNumber(inv.vat_rate) > 0;
    const amountExVat = safeNumber(inv.vat_amount) > 0
      ? safeNumber(inv.amount) - safeNumber(inv.vat_amount)
      : (safeNumber(inv.vat_rate) > 0 ? safeNumber(inv.amount) / (1 + safeNumber(inv.vat_rate) / 100) : safeNumber(inv.amount));

    return {
      invoiceNumber: inv.invoice_number,
      date: inv.due_date,
      type: (hasVat && hasBuyerTax) ? 'standard' : 'simplified',
      sellerName: waqfInfo.waqfName || 'وقف مرزوق بن علي الثبيتي',
      sellerAddress: waqfInfo.address,
      sellerVatNumber: waqfInfo.vatNumber,
      sellerCR: waqfInfo.commercialReg,
      sellerLogo: waqfInfo.logoUrl,
      buyerName: fullContract?.tenant_name || inv.contract?.tenant_name || '-',
      buyerVatNumber: fullContract?.tenant_tax_number || undefined,
      buyerCR: fullContract?.tenant_crn || undefined,
      buyerIdType: fullContract?.tenant_id_type || undefined,
      buyerIdNumber: fullContract?.tenant_id_number || undefined,
      buyerStreet: fullContract?.tenant_street || undefined,
      buyerDistrict: fullContract?.tenant_district || undefined,
      buyerCity: fullContract?.tenant_city || undefined,
      buyerPostalCode: fullContract?.tenant_postal_code || undefined,
      buyerBuilding: fullContract?.tenant_building || undefined,
      items: [{
        description: `إيجار — دفعة ${inv.payment_number}${inv.contract?.contract_number ? ` / عقد ${inv.contract.contract_number}` : ''}`,
        quantity: 1,
        unitPrice: amountExVat,
        vatRate: safeNumber(inv.vat_rate),
      }],
      notes: inv.notes || undefined,
      status: inv.status,
      bankName: waqfInfo.bankName,
      bankIBAN: waqfInfo.bankIBAN,
      zatcaUuid: inv.zatca_uuid || undefined,
      zatcaStatus: inv.zatca_status || undefined,
    };
  };

  const handlePreviewTemplate = (inv: PaymentInvoice) => {
    setPreviewInvoice(buildPaymentPreviewData(inv));
  };

  return {
    isLoading, invoices, summary, sorted, groupedPaginated, ITEMS_PER_PAGE,
    // فلترة وبحث
    search, setSearch, filter, setFilter, dateFrom, setDateFrom, dateTo, setDateTo,
    // ترتيب
    sortKey, sortDir, toggleSort,
    // تصفح
    currentPage, setCurrentPage,
    // تحديد جماعي وتسديد — من usePaymentInvoiceActions
    selectedIds: actions.selectedIds,
    unpaidFiltered,
    toggleSelect: actions.toggleSelect,
    toggleSelectAll: () => actions.toggleSelectAll(unpaidFiltered.map(i => i.id)),
    bulkPaying: actions.bulkPaying,
    handleBulkPay: actions.handleBulkPay,
    clearSelection: actions.clearSelection,
    // تسديد
    payingInvoiceId: actions.payingInvoiceId,
    payDialog: actions.payDialog,
    setPayDialog: actions.setPayDialog,
    payAmount: actions.payAmount,
    setPayAmount: actions.setPayAmount,
    openPayDialog: actions.openPayDialog,
    handlePay: actions.handlePay,
    // معاينة
    previewInvoice, setPreviewInvoice, handlePreviewTemplate,
    // أخرى
    generateAll, markUnpaid: actions.markUnpaid, waqfInfo,
  };
};
