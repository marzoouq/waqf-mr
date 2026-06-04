/**
 * هوك إدارة حالة تبويب فواتير الدفعات — orchestrator
 * تم استخراج إجراءات الدفع إلى usePaymentInvoiceActions (#22)
 */
import { useMemo, useState, useEffect } from 'react';
import { uiNotify } from '@/lib/notify';
import { safeNumber } from '@/utils/format/safeNumber';
import {
  type PaymentInvoice,
  usePaymentInvoices,
  useGenerateAllInvoices,
} from '@/hooks/data/invoices/usePaymentInvoices';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import type { InvoicePreviewData } from '@/types/invoices';
import { usePaymentInvoiceActions } from './usePaymentInvoiceActions';
import { DEFAULT_WAQF_NAME } from '@/constants/waqf';
import { PAGE_SIZE_LIST } from '@/constants/pagination';
import {
  summarizePaymentInvoices,
  filterPaymentInvoices,
  sortPaymentInvoices,
  groupByContract,
  type InvoiceFilterStatus,
  type SortKey,
} from '@/utils/financial/paymentInvoicesCompute';

import type { SortDir } from '@/types/sorting';

export type { InvoiceFilterStatus, SortKey };

const ITEMS_PER_PAGE = PAGE_SIZE_LIST;

export const usePaymentInvoicesTab = (fiscalYearId: string) => {
  const { data: invoices = [], isLoading } = usePaymentInvoices(fiscalYearId);
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const generateAllRaw = useGenerateAllInvoices();
  const waqfInfo = usePdfWaqfInfo();

  // Wrapper مع إشعارات — data hook نقي بدون toast
  const generateAll = useMemo(
    () => ({
      mutate: () =>
        generateAllRaw.mutate(undefined, {
          onSuccess: (count) =>
            uiNotify.success(`تم توليد ${count} فاتورة لجميع العقود النشطة`),
          onError: () => uiNotify.error('فشل توليد الفواتير'),
        }),
      isPending: generateAllRaw.isPending,
    }),
    [generateAllRaw],
  );

  // إجراءات الدفع — مُستخرجة (#22)
  const actions = usePaymentInvoiceActions();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InvoiceFilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreviewData | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when filters/search change
  useEffect(() => { setCurrentPage(1); }, [filter, search, dateFrom, dateTo]);

  const summary = useMemo(() => summarizePaymentInvoices(invoices), [invoices]);

  const filtered = useMemo(
    () => filterPaymentInvoices(invoices, filter, search, dateFrom, dateTo),
    [invoices, filter, search, dateFrom, dateTo],
  );

  const sorted = useMemo(
    () => sortPaymentInvoices(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  const groupedPaginated = useMemo(() => groupByContract(paginated), [paginated]);

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
      sellerName: waqfInfo.waqfName || DEFAULT_WAQF_NAME,
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
