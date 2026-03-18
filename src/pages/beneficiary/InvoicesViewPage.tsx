import DashboardLayout from '@/components/DashboardLayout';
import { safeNumber } from '@/utils/safeNumber';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, useInvoicesByFiscalYear } from '@/hooks/useInvoices';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';
import { FileText, Search, Eye, LayoutGrid, List, AlertCircle, RefreshCw } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import ExportMenu from '@/components/ExportMenu';
import TablePagination from '@/components/TablePagination';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';
import InvoiceGridView from '@/components/invoices/InvoiceGridView';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { generateInvoicesViewPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import { fmt } from '@/utils/format';

const InvoicesViewPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries(), [queryClient]);
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, noPublishedYears, fiscalYear } = useFiscalYear();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: invoices = [], isLoading, isError } = useInvoicesByFiscalYear(noPublishedYears ? '__none__' : fiscalYearId);
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
      item.date.includes(q)
    );
  });

  const statusBadgeVariant = (status: string) => {
    if (status === 'paid') return 'default';
    if (status === 'cancelled') return 'destructive';
    return 'secondary';
  };

  const handleDownloadPDF = async () => {
    try {
      await generateInvoicesViewPDF(
        filteredInvoices.map(inv => ({
          invoice_type: INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
          invoice_number: inv.invoice_number,
          amount: safeNumber(inv.amount),
          date: inv.date,
          property_number: inv.property?.property_number || '-',
          status: inv.status,
        })),
        pdfWaqfInfo
      );
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  };

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5">
          <PageHeaderCard title="الفواتير" icon={FileText} description="عرض جميع فواتير الوقف" />
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل الفواتير</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="الفواتير"
          description="عرض جميع فواتير الوقف"
          icon={FileText}
          actions={<ExportMenu onExportPdf={handleDownloadPDF} />}
        />

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-end">
          <div className="flex gap-1 border rounded-lg p-1">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="gap-1">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">جدول</span>
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="gap-1">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">شبكي</span>
            </Button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث في الفواتير..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
        </div>

        {viewMode === 'grid' ? (
          isLoading ? <TableSkeleton rows={4} cols={3} /> : <InvoiceGridView invoices={filteredInvoices} readOnly />
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
              ) : filteredInvoices.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج' : 'لا توجد فواتير'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">رقم الفاتورة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">العقار</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الملف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{INVOICE_TYPE_LABELS[item.invoice_type] || item.invoice_type}</TableCell>
                          <TableCell>{item.invoice_number || '-'}</TableCell>
                          <TableCell className="font-medium">{fmt(safeNumber(item.amount))} ر.س</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.property?.property_number || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(item.status)}>
                              {INVOICE_STATUS_LABELS[item.status] || item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.file_path ? (
                              <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => setViewerFile({ path: item.file_path!, name: item.file_name })}>
                                <Eye className="w-4 h-4" /><span className="hidden sm:inline">عرض</span>
                              </Button>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <TablePagination currentPage={currentPage} totalItems={filteredInvoices.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
            </CardContent>
          </Card>
        )}
        <InvoiceViewer
          open={!!viewerFile}
          onOpenChange={(open) => !open && setViewerFile(null)}
          filePath={viewerFile?.path || null}
          fileName={viewerFile?.name || null}
        />
      </div>
    </DashboardLayout>
  );
};

export default InvoicesViewPage;
