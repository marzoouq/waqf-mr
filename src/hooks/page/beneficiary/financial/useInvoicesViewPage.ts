/**
 * هوك صفحة الفواتير للمستفيد — فواتير الإيجار (ZATCA) فقط.
 *
 * فواتير الموردين (`invoices`) لا تُعرض هنا لتفادي التكرار مع صفحة
 * "مصروفات الوقف" التي تعرضها كمستندات مرفقة بالمصروفات.
 */
import { useState, useCallback, useMemo } from 'react';
import { uiNotify } from '@/lib/notify';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { INVOICE_TYPE_LABELS } from '@/hooks/data/invoices/useInvoices';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { useRetryQueries } from '@/hooks/data/core/useRetryQueries';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { safeNumber } from '@/utils/format/safeNumber';
import { invoiceStatusBadgeVariant } from '@/utils/ui/badgeVariants';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import type { UnifiedInvoiceItem } from '@/types/invoices';
import { PDF_MESSAGES } from '@/lib/messages';

export type { UnifiedInvoiceItem };

export function useInvoicesViewPage() {
  const isMobile = useIsMobile();
  const handleRetry = useRetryQueries(['payment_invoices']);
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Realtime — تحديث فوري عند إصدار/تعديل فواتير الإيجار
  useDashboardRealtime(
    'invoices-view-realtime',
    ['payment_invoices'],
    true,
  );

  const { data: rentInvoices = [], isLoading, isError } = usePaymentInvoices(fiscalYearId);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);

  const unifiedInvoices: UnifiedInvoiceItem[] = useMemo(
    () => rentInvoices
      .map((inv) => ({
        id: inv.id,
        invoice_type: 'rent_invoice',
        invoice_number: inv.invoice_number || null,
        amount: safeNumber(inv.amount),
        date: inv.due_date,
        status: inv.status,
        file_path: inv.file_path,
        file_name: inv.invoice_number ? `${inv.invoice_number}.pdf` : null,
        property: inv.contract?.property ? { property_number: inv.contract.property.property_number } : null,
        source: 'rent' as const,
      }))
      .sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
      }),
    [rentInvoices],
  );

  const filteredInvoices = useMemo(() => unifiedInvoices.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.invoice_number || '').toLowerCase().includes(q) ||
      (INVOICE_TYPE_LABELS[item.invoice_type] || '').includes(q) ||
      item.date.includes(q)
    );
  }), [unifiedInvoices, searchQuery]);

  const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDownloadPDF = useCallback(async () => {
    try {
      if (searchQuery) {
        uiNotify.info(`سيتم تصدير ${filteredInvoices.length} فاتورة مفلترة فقط`);
      }
      const fiscalYearLabel = fiscalYear?.label || undefined;
      const { generateInvoicesViewPDF } = await import('@/utils/pdf');
      await generateInvoicesViewPDF(
        filteredInvoices.map(inv => ({
          invoice_type: INVOICE_TYPE_LABELS[inv.invoice_type] || 'فاتورة إيجار',
          invoice_number: inv.invoice_number,
          amount: safeNumber(inv.amount),
          date: inv.date,
          property_number: inv.property?.property_number || '-',
          status: inv.status,
        })),
        pdfWaqfInfo,
        fiscalYearLabel
      );
      uiNotify.success(PDF_MESSAGES.downloadSuccess);
    } catch {
      uiNotify.error(PDF_MESSAGES.exportError);
    }
  }, [searchQuery, filteredInvoices, fiscalYear, pdfWaqfInfo]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  return {
    isLoading, isError, isMobile,
    viewMode, setViewMode,
    searchQuery, handleSearchChange,
    currentPage, setCurrentPage,
    ITEMS_PER_PAGE,
    filteredInvoices, paginatedInvoices,
    statusBadgeVariant: invoiceStatusBadgeVariant,
    viewerFile, setViewerFile,
    handleRetry, handleDownloadPDF,
  };
}
