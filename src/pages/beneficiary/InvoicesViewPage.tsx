import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInvoices, getInvoiceSignedUrl, INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, useInvoicesByFiscalYear } from '@/hooks/useInvoices';
import { useActiveFiscalYear } from '@/hooks/useFiscalYears';
import { FileText, Search, Eye, Download, LayoutGrid, List } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import TablePagination from '@/components/TablePagination';
import FiscalYearSelector from '@/components/FiscalYearSelector';
import InvoiceGridView from '@/components/invoices/InvoiceGridView';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';
import { generateInvoicesViewPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';

const InvoicesViewPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: activeFY } = useActiveFiscalYear();
  const [selectedFY, setSelectedFY] = useState<string>('');
  const fiscalYearId = selectedFY || activeFY?.id || 'all';
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: invoices = [], isLoading } = useInvoicesByFiscalYear(fiscalYearId);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const handleViewFile = async (filePath: string) => {
    try {
      const url = await getInvoiceSignedUrl(filePath);
      window.open(url, '_blank');
    } catch {
      toast.error('حدث خطأ أثناء فتح الملف');
    }
  };

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
          amount: Number(inv.amount),
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">الفواتير</h1>
            <p className="text-muted-foreground mt-1">عرض جميع فواتير الوقف</p>
          </div>
          <div className="flex gap-2">
            <ExportMenu onExportPdf={handleDownloadPDF} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 justify-between">
          <FiscalYearSelector value={fiscalYearId} onChange={setSelectedFY} />
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="gap-1"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">جدول</span>
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="gap-1"
            >
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
          <InvoiceGridView invoices={filteredInvoices} readOnly />
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
              ) : filteredInvoices.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج' : 'لا توجد فواتير'}</p>
                </div>
              ) : (
                <Table>
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
                        <TableCell className="font-medium">{Number(item.amount).toLocaleString()} ر.س</TableCell>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.property?.property_number || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(item.status)}>
                            {INVOICE_STATUS_LABELS[item.status] || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.file_path ? (
                            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => handleViewFile(item.file_path!)}>
                              <Eye className="w-4 h-4" />عرض
                            </Button>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <TablePagination currentPage={currentPage} totalItems={filteredInvoices.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InvoicesViewPage;
