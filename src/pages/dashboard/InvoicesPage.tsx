import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, uploadInvoiceFile, INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, Invoice, useInvoicesByFiscalYear, useGenerateInvoicePdf } from '@/hooks/useInvoices';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';
import { useProperties } from '@/hooks/useProperties';
import { useContracts } from '@/hooks/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Plus, Trash2, FileText, Search, Upload, Eye, Edit, LayoutGrid, List, FileDown, X } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import { generateInvoicesViewPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import InvoiceGridView from '@/components/invoices/InvoiceGridView';
import TablePagination from '@/components/TablePagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const InvoicesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const activeFYId = fiscalYear?.status === 'active' ? fiscalYear.id : undefined;
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: invoices = [], isLoading } = useInvoicesByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContracts();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const generatePdf = useGenerateInvoicePdf();

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; file_path?: string | null } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview blob URL on unmount or change
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const validateAndSetFile = (file: File) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError('نوع الملف غير مسموح. الأنواع المسموحة: PDF, JPG, PNG, WEBP');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('حجم الملف يتجاوز الحد الأقصى (10 ميجابايت)');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFileError('');
    setSelectedFile(file);
    // Generate image preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };
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
    setFileError('');
    setEditingInvoice(null);
    setPreviewUrl(null);
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

      const invoiceData: Record<string, unknown> = {
        invoice_number: formData.invoice_number || null,
        invoice_type: formData.invoice_type,
        amount: parseFloat(formData.amount) || 0,
        date: formData.date,
        property_id: formData.property_id || null,
        contract_id: formData.contract_id || null,
        description: formData.description || null,
        status: formData.status,
      };

      if (!editingInvoice && activeFYId) {
        invoiceData.fiscal_year_id = activeFYId;
      }

      if (selectedFile) {
        if (editingInvoice?.file_path) {
          await supabase.storage.from('invoices').remove([editingInvoice.file_path]);
        }
        const { path, name } = await uploadInvoiceFile(selectedFile);
        invoiceData.file_path = path;
        invoiceData.file_name = name;
      }

      const filePath = invoiceData.file_path as string | undefined;
      const fileName = invoiceData.file_name as string | undefined;

      if (editingInvoice) {
        await updateInvoice.mutateAsync({ id: editingInvoice.id, ...invoiceData } as unknown as Parameters<typeof updateInvoice.mutateAsync>[0]);
      } else {
        await createInvoice.mutateAsync(invoiceData as unknown as Parameters<typeof createInvoice.mutateAsync>[0]);
      }

      setIsOpen(false);
      resetForm();

      // Show success toast with view action if file exists
      const viewablePath = filePath || editingInvoice?.file_path;
      const viewableName = fileName || editingInvoice?.file_name;
      if (viewablePath) {
        toast.success(
          editingInvoice ? 'تم تحديث الفاتورة بنجاح' : 'تم رفع الفاتورة بنجاح',
          {
            action: {
              label: 'عرض',
              onClick: () => setViewerFile({ path: viewablePath, name: viewableName || null }),
            },
          },
        );
      }
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
       <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الفواتير</p>
                <p className="text-lg sm:text-2xl font-bold">{invoices.length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground">المدفوعة</p>
                <p className="text-lg sm:text-2xl font-bold text-success">{invoices.filter(i => i.status === 'paid').length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground">المعلقة</p>
                <p className="text-lg sm:text-2xl font-bold text-warning">{invoices.filter(i => i.status === 'pending').length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground">إجمالي المبالغ</p>
                <p className="text-lg sm:text-2xl font-bold text-primary">{invoices.reduce((s, i) => s + Number(i.amount), 0).toLocaleString()} ر.س</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">إدارة الفواتير</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">رفع وإدارة جميع أنواع الفواتير</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {(() => {
              const withoutFiles = invoices.filter(inv => !inv.file_path);
              return withoutFiles.length > 0 ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={generatePdf.isPending}
                  onClick={() => generatePdf.mutate(withoutFiles.map(inv => inv.id))}
                >
                  <FileDown className="w-4 h-4" />
                  {generatePdf.isPending ? 'جاري التوليد...' : `توليد PDF (${withoutFiles.length})`}
                </Button>
              ) : null;
            })()}
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
                <Button className="gradient-primary gap-2"><Plus className="w-4 h-4" /><span className="hidden sm:inline">رفع فاتورة</span></Button>
              </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingInvoice ? 'تعديل الفاتورة' : 'رفع فاتورة جديدة'}</DialogTitle><DialogDescription className="sr-only">نموذج رفع أو تعديل فاتورة</DialogDescription></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{editingInvoice ? 'تغيير ملف الفاتورة (اختياري)' : 'ملف الفاتورة (صورة أو PDF) *'}</Label>
                  <div
                    className={`border-2 rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-primary bg-primary/5 border-solid'
                        : 'border-dashed hover:border-primary/50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) validateAndSetFile(file);
                    }}
                    >
                    {previewUrl && selectedFile ? (
                      <div className="relative inline-block">
                        <img src={previewUrl} alt="معاينة" className="max-h-32 rounded-md mx-auto object-contain" />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setPreviewUrl(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <p className="text-xs text-muted-foreground mt-1">{selectedFile.name}</p>
                      </div>
                    ) : (
                      <>
                        <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className={`text-sm ${isDragging ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          {isDragging ? 'أفلت الملف هنا' : selectedFile ? selectedFile.name : editingInvoice?.file_name ? `الملف الحالي: ${editingInvoice.file_name}` : 'اضغط لاختيار ملف أو اسحبه هنا'}
                        </p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) { setSelectedFile(null); return; }
                        validateAndSetFile(file);
                      }}
                    />
                  </div>
                  {fileError && <p className="text-sm text-destructive mt-1">{fileError}</p>}
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
          <div></div>
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
                <div className="overflow-x-auto"><Table className="min-w-[800px]">
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
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-warning"
                              disabled={generatePdf.isPending}
                              onClick={() => generatePdf.mutate([item.id])}
                            >
                              <FileDown className="w-4 h-4" />
                              <span className="text-xs">توليد PDF</span>
                            </Button>
                          )}
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
                </Table></div>
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
