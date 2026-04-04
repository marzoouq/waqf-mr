/**
 * هوك صفحة الفواتير — يستخرج كل المنطق من InvoicesViewPage
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/ui/use-mobile';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { INVOICE_TYPE_LABELS, useInvoicesByFiscalYear } from '@/hooks/data/invoices/useInvoices';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { generateInvoicesViewPDF } from '@/utils/pdf';
import { safeNumber } from '@/utils/format/safeNumber';

const ITEMS_PER_PAGE = 10;

export function useInvoicesViewPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries({ queryKey: ['invoices'] }), [queryClient]);
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: invoices = [], isLoading, isError } = useInvoicesByFiscalYear(fiscalYearId);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);

  const filteredInvoices = invoices.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.invoice_number || '').toLowerCase().includes(q) ||
      (INVOICE_TYPE_LABELS[item.invoice_type] || '').includes(q) ||
      item.date.includes(q)
    );
  });

  const statusBadgeVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    if (status === 'paid') return 'default';
    if (status === 'cancelled' || status === 'overdue') return 'destructive';
    return 'secondary';
  };

  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDownloadPDF = useCallback(async () => {
    try {
      if (searchQuery) {
        toast.info(`سيتم تصدير ${filteredInvoices.length} فاتورة مفلترة فقط`);
      }
      const fiscalYearLabel = fiscalYear?.label || undefined;
      await generateInvoicesViewPDF(
        filteredInvoices.map(inv => ({
          invoice_type: INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
          invoice_number: inv.invoice_number,
          amount: safeNumber(inv.amount),
          date: inv.date,
          property_number: inv.property?.property_number || '-',
          status: inv.status,
        })),
        pdfWaqfInfo,
        fiscalYearLabel
      );
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [searchQuery, filteredInvoices, fiscalYear, pdfWaqfInfo]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  return {
    // حالات التحميل والخطأ
    isLoading, isError, isMobile,
    // بيانات العرض
    viewMode, setViewMode,
    searchQuery, handleSearchChange,
    currentPage, setCurrentPage,
    ITEMS_PER_PAGE,
    // بيانات الفواتير
    filteredInvoices, paginatedInvoices,
    statusBadgeVariant,
    // عارض الملفات
    viewerFile, setViewerFile,
    // دوال الإجراءات
    handleRetry, handleDownloadPDF,
  };
}
