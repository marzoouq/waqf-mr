import DashboardLayout from '@/components/dashboard-layout';
import { safeNumber } from '@/utils/safeNumber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INVOICE_TYPE_LABELS, useInvoicesByFiscalYear } from '@/hooks/data/useInvoices';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';
import { FileText, Search, LayoutGrid, List, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import PageHeaderCard from '@/components/PageHeaderCard';
import ExportMenu from '@/components/ExportMenu';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import RequirePublishedYears from '@/components/RequirePublishedYears';
import InvoiceGridView from '@/components/invoices/InvoiceGridView';
import { toast } from 'sonner';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { TableSkeleton } from '@/components/SkeletonLoaders';

// مكونات مستخرجة
import InvoicesMobileList from '@/components/invoices/InvoicesMobileList';
import InvoicesViewDesktopTable from '@/components/invoices/InvoicesViewDesktopTable';

const statusBadgeVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (status === 'paid') return 'default';
  if (status === 'cancelled' || status === 'overdue') return 'destructive';
  return 'secondary';
};

const InvoicesViewPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries({ queryKey: ['invoices'] }), [queryClient]);
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { getJsonSetting } = useAppSettings();
  const beneficiarySections = getJsonSetting<Record<string, boolean>>('beneficiary_sections', {});
  const showAttachments = beneficiarySections['invoice_attachments'] !== false;

  const { data: invoices = [], isLoading, isError } = useInvoicesByFiscalYear(fiscalYearId);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);

  const filteredInvoices = invoices.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.invoice_number || '').toLowerCase().includes(q) ||
      (INVOICE_TYPE_LABELS[item.invoice_type] || '').includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      item.date.includes(q)
    );
  });

  const handleDownloadPDF = async () => {
    try {
      if (searchQuery) toast.info(`سيتم تصدير ${filteredInvoices.length} فاتورة مفلترة فقط`);
      const { generateInvoicesViewPDF } = await import('@/utils/pdf');
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
        fiscalYear?.label || undefined,
      );
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  };

  const handleViewFile = (path: string, name: string | null) => setViewerFile({ path, name });

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل الفواتير</h2>
          <Button onClick={handleRetry} className="gap-2"><RefreshCw className="w-4 h-4" /> إعادة المحاولة</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RequirePublishedYears title="الفواتير" icon={FileText} description="عرض جميع فواتير الوقف">
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard title="الفواتير" description="عرض جميع فواتير الوقف" icon={FileText} actions={<ExportMenu onExportPdf={handleDownloadPDF} />} />

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-end">
          <div className="flex gap-1 border rounded-lg p-1">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="gap-1">
              <List className="w-4 h-4" /><span className="hidden sm:inline">جدول</span>
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="gap-1">
              <LayoutGrid className="w-4 h-4" /><span className="hidden sm:inline">شبكي</span>
            </Button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input name="searchQuery" placeholder="بحث في الفواتير..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
        </div>

        {viewMode === 'grid' ? (
          isLoading ? <TableSkeleton rows={4} cols={3} /> : <InvoiceGridView invoices={filteredInvoices} readOnly />
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {isLoading ? <TableSkeleton rows={4} cols={2} /> : (
                <InvoicesMobileList
                  invoices={filteredInvoices} currentPage={currentPage} itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage} showAttachments={showAttachments} onViewFile={handleViewFile}
                  searchQuery={searchQuery} statusBadgeVariant={statusBadgeVariant}
                />
              )}
            </div>
            <InvoicesViewDesktopTable
              invoices={filteredInvoices} currentPage={currentPage} itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage} showAttachments={showAttachments} onViewFile={handleViewFile}
              searchQuery={searchQuery} statusBadgeVariant={statusBadgeVariant} isLoading={isLoading}
            />
          </>
        )}

        <InvoiceViewer open={!!viewerFile} onOpenChange={(open) => !open && setViewerFile(null)} filePath={viewerFile?.path || null} fileName={viewerFile?.name || null} />
      </div>
    </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default InvoicesViewPage;
