/**
 * هوك صفحة الفواتير — يستخرج كل المنطق من InvoicesViewPage
 * يدمج فواتير الشراء (invoices) وفواتير الإيجار (payment_invoices) في عرض موحّد للمستفيد
 */
import { useState, useCallback, useMemo } from 'react';
import { defaultNotify } from '@/lib/notify';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { INVOICE_TYPE_LABELS, useInvoicesByFiscalYear } from '@/hooks/data/invoices/useInvoices';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { useRetryQueries } from '@/hooks/data/core/useRetryQueries';
import { safeNumber } from '@/utils/format/safeNumber';
import { invoiceStatusBadgeVariant } from '@/utils/ui/badgeVariants';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

export type InvoiceSourceFilter = 'all' | 'expense' | 'rent';

export interface UnifiedInvoiceItem {
  id: string;
  invoice_type: string;
  invoice_number: string | null;
  amount: number;
  date: string;
  status: string;
  file_path: string | null;
  file_name: string | null;
  property?: { property_number: string } | null;
  source: 'expense' | 'rent';
}

export function useInvoicesViewPage() {
  const isMobile = useIsMobile();
  const handleRetry = useRetryQueries(['invoices', 'payment_invoices']);
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: expenseInvoices = [], isLoading: loadingExpense, isError: errExpense } = useInvoicesByFiscalYear(fiscalYearId);
  const { data: rentInvoices = [], isLoading: loadingRent, isError: errRent } = usePaymentInvoices(fiscalYearId);

  const isLoading = loadingExpense || loadingRent;
  const isError = errExpense || errRent;

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<InvoiceSourceFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);

  // دمج الفواتير من المصدرين بشكل موحّد
  const unifiedInvoices: UnifiedInvoiceItem[] = useMemo(() => {
    const expenseItems: UnifiedInvoiceItem[] = expenseInvoices.map((inv) => ({
      id: inv.id,
      invoice_type: inv.invoice_type,
      invoice_number: inv.invoice_number,
      amount: safeNumber(inv.amount),
      date: inv.date,
      status: inv.status,
      file_path: inv.file_path,
      file_name: inv.file_name,
      property: inv.property ? { property_number: inv.property.property_number } : null,
      source: 'expense',
    }));
    const rentItems: UnifiedInvoiceItem[] = rentInvoices.map((inv) => ({
      id: inv.id,
      invoice_type: 'rent_invoice',
      invoice_number: inv.invoice_number || null,
      amount: safeNumber(inv.amount),
      date: inv.due_date,
      status: inv.status,
      file_path: inv.file_path,
      file_name: inv.invoice_number ? `${inv.invoice_number}.pdf` : null,
      property: inv.contract?.property ? { property_number: inv.contract.property.property_number } : null,
      source: 'rent',
    }));
    return [...expenseItems, ...rentItems].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [expenseInvoices, rentInvoices]);

  const filteredInvoices = useMemo(() => unifiedInvoices.filter((item) => {
    if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.invoice_number || '').toLowerCase().includes(q) ||
      (INVOICE_TYPE_LABELS[item.invoice_type] || '').includes(q) ||
      item.date.includes(q)
    );
  }), [unifiedInvoices, searchQuery, sourceFilter]);

  const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDownloadPDF = useCallback(async () => {
    try {
      if (searchQuery) {
        defaultNotify.info(`سيتم تصدير ${filteredInvoices.length} فاتورة مفلترة فقط`);
      }
      const fiscalYearLabel = fiscalYear?.label || undefined;
      const { generateInvoicesViewPDF } = await import('@/utils/pdf');
      await generateInvoicesViewPDF(
        filteredInvoices.map(inv => ({
          invoice_type: INVOICE_TYPE_LABELS[inv.invoice_type] || (inv.source === 'rent' ? 'فاتورة إيجار' : inv.invoice_type),
          invoice_number: inv.invoice_number,
          amount: safeNumber(inv.amount),
          date: inv.date,
          property_number: inv.property?.property_number || '-',
          status: inv.status,
        })),
        pdfWaqfInfo,
        fiscalYearLabel
      );
      defaultNotify.success('تم تحميل ملف PDF بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [searchQuery, filteredInvoices, fiscalYear, pdfWaqfInfo]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleSourceFilterChange = useCallback((value: InvoiceSourceFilter) => {
    setSourceFilter(value);
    setCurrentPage(1);
  }, []);

  return {
    // حالات التحميل والخطأ
    isLoading, isError, isMobile,
    // بيانات العرض
    viewMode, setViewMode,
    searchQuery, handleSearchChange,
    sourceFilter, handleSourceFilterChange,
    currentPage, setCurrentPage,
    ITEMS_PER_PAGE,
    // بيانات الفواتير
    filteredInvoices, paginatedInvoices,
    statusBadgeVariant: invoiceStatusBadgeVariant,
    // عارض الملفات
    viewerFile, setViewerFile,
    // دوال الإجراءات
    handleRetry, handleDownloadPDF,
  };
}
