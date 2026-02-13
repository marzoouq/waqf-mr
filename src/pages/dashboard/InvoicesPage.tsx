import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, uploadInvoiceFile, INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, Invoice, useInvoicesByFiscalYear } from '@/hooks/useInvoices';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';
import { useProperties } from '@/hooks/useProperties';
import { useContracts } from '@/hooks/useContracts';
import { useActiveFiscalYear } from '@/hooks/useFiscalYears';
import { Plus, Trash2, FileText, Search, Upload, Eye, Edit, LayoutGrid, List } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import { generateInvoicesViewPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import FiscalYearSelector from '@/components/FiscalYearSelector';
import InvoiceGridView from '@/components/invoices/InvoiceGridView';
import TablePagination from '@/components/TablePagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const InvoicesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: activeFY } = useActiveFiscalYear();
  const [selectedFY, setSelectedFY] = useState<string>('');
  const fiscalYearId = selectedFY || activeFY?.id || 'all';
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: invoices = [], isLoading } = useInvoicesByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContracts();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; file_path?: string | null } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 10;

  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_type: '',
    amount: '',
    date: '',
    property_id: '',
    contract_id: '',
    description: '',
    status: 'pending',
  });

  const resetForm = () => {
    setFormData({ invoice_number: '', invoice_type: '', amount: '', date: '', property_id: '', contract_id: '', description: '', status: 'pending' });
    setSelectedFile(null);
    setEditingInvoice(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (item: Invoice) => {
    setEditingInvoice(item);
    setFormData({
      invoice_number: item.invoice_number || '',
      invoice_type: item.invoice_type,
      amount: item.amount.toString(),
      date: item.date,
      property_id: item.property_id || '',
      contract_id: item.contract_id || '',
      description: item.description || '',
      status: item.status,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoice_type || !formData.date) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }
    if (!editingInvoice && !selectedFile) {
      toast.error('يرجى رفع ملف الفاتورة');
      return;
    }

    try {
      setUploading(true);

      const invoiceData: Record<string, any> = {
        invoice_number: formData.invoice_number || null,
        invoice_type: formData.invoice_type,
        amount: parseFloat(formData.amount) || 0,
        date: formData.date,
        property_id: formData.property_id || null,
        contract_id: formData.contract_id || null,
        description: formData.description || null,
        status: formData.status,
      };

      // Auto-assign active fiscal year for new records
      if (!editingInvoice && activeFY) {
        invoiceData.fiscal_year_id = activeFY.id;
      }

      if (selectedFile) {
        if (editingInvoice?.file_path) {
          await supabase.storage.from('invoices').remove([editingInvoice.file_path]);
        }
        const { path, name } = await uploadInvoiceFile(selectedFile);
        invoiceData.file_path = path;
        invoiceData.file_name = name;
      }

      if (editingInvoice) {
        await updateInvoice.mutateAsync({ id: editingInvoice.id, ...invoiceData });
      } else {
        await createInvoice.mutateAsync(invoiceData as any);
      }

      setIsOpen(false);
      resetForm();
    } catch {
      toast.error('حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setUploading(false);
    }
  };

  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteInvoice.mutateAsync({ id: deleteTarget.id, file_path: deleteTarget.file_path });
    setDeleteTarget(null);
  };

  const filteredInvoices = invoices.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.invoice_number || '').toLowerCase().includes(q) ||
      (INVOICE_TYPE_LABELS[item.invoice_type] || '').includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.file_name || '').toLowerCase().includes(q) ||
      item.date.includes(q)
    );
  });

  const statusBadgeVariant = (status: string) => {
    if (status === 'paid') return 'default';
    if (status === 'cancelled') return 'destructive';
    return 'secondary';
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">إدارة الفواتير</h1>
            <p className="text-muted-foreground mt-1 text-sm">رفع وإدارة جميع أنواع الفواتير</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ExportMenu onExportPdf={async () => {
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
            }} />
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2"><Plus className="w-4 h-4" />رفع فاتورة</Button>
              </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingInvoice ? 'تعديل الفاتورة' : 'رفع فاتورة جديدة'}</DialogTitle><DialogDescription className="sr-only">نموذج رفع أو تعديل فاتورة</DialogDescription></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{editingInvoice ? 'تغيير ملف الفاتورة (اختياري)' : 'ملف الفاتورة (صورة أو PDF) *'}</Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : editingInvoice?.file_name ? `الملف الحالي: ${editingInvoice.file_name}` : 'اضغط لاختيار ملف أو اسحبه هنا'}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>نوع الفاتورة *</Label>
                  <Select value={formData.invoice_type} onValueChange={(v) => setFormData({ ...formData, invoice_type: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(INVOICE_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>رقم الفاتورة</Label>
                    <Input value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} placeholder="اختياري" />
                  </div>
                  <div className="space-y-2">
                    <Label>المبلغ (ر.س)</Label>
                    <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>التاريخ *</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(INVOICE_STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>العقار (اختياري)</Label>
                  <Select value={formData.property_id} onValueChange={(v) => setFormData({ ...formData, property_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر العقار" /></SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.property_number} - {p.location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>العقد (اختياري)</Label>
                  <Select value={formData.contract_id} onValueChange={(v) => setFormData({ ...formData, contract_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر العقد" /></SelectTrigger>
                    <SelectContent>
                      {contracts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.contract_number} - {c.tenant_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>وصف</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف إضافي" />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 gradient-primary" disabled={uploading || createInvoice.isPending || updateInvoice.isPending}>
                    {uploading ? 'جاري الحفظ...' : editingInvoice ? 'تحديث' : 'رفع الفاتورة'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
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
          <InvoiceGridView invoices={filteredInvoices} onEdit={handleEdit} />
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
              ) : filteredInvoices.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد فواتير مرفوعة'}</p>
                </div>
              ) : (
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">العقار</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الملف</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
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
                            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => setViewerFile({ path: item.file_path!, name: item.file_name })}>
                              <Eye className="w-4 h-4" />
                              <span className="text-xs truncate max-w-[80px]">{item.file_name}</span>
                            </Button>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget({ id: item.id, name: item.file_name || 'فاتورة', file_path: item.file_path })}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
              <AlertDialogDescription>سيتم حذف الفاتورة "{deleteTarget?.name}" نهائياً مع ملفها ولا يمكن التراجع.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

export default InvoicesPage;
