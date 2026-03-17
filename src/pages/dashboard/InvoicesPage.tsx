import { useState, useRef, useEffect, useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateInvoice, useUpdateInvoice, useDeleteInvoice, uploadInvoiceFile, INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, Invoice, useInvoicesByFiscalYear, useGenerateInvoicePdf, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/hooks/useInvoices';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';
import InvoicePreviewDialog, { type InvoicePreviewData } from '@/components/invoices/InvoicePreviewDialog';
import CreateInvoiceFromTemplate from '@/components/invoices/CreateInvoiceFromTemplate';
import { useProperties } from '@/hooks/useProperties';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Plus, Trash2, FileText, Search, Upload, Eye, Edit, LayoutGrid, List, FileDown, X, AlertTriangle } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import ExportMenu from '@/components/ExportMenu';
import { generateInvoicesViewPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import InvoiceGridView from '@/components/invoices/InvoiceGridView';
import InvoiceSummaryCards from '@/components/invoices/InvoiceSummaryCards';
import TablePagination from '@/components/TablePagination';
import MobileCardView from '@/components/MobileCardView';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// HIGH-4: تعقيم الوصف ضد CSV Injection
const sanitizeDescription = (value: string): string => {
  if (!value) return value;
  return value.replace(/^[=+\-@\t\r]+/, '');
};

const InvoicesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: invoices = [], isLoading } = useInvoicesByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const generatePdf = useGenerateInvoicePdf();

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; file_path?: string | null } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [_fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreviewData | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  // بناء بيانات المعاينة من فاتورة — مع بيانات المشتري وZATCA
  const buildPreviewData = (inv: Invoice): InvoicePreviewData => {
    // جلب بيانات العقد لبيانات المشتري التفصيلية
    const contract = contracts.find(c => c.id === inv.contract_id);
    const hasVat = safeNumber(inv.vat_rate) > 0;
    const hasBuyerTax = !!contract?.tenant_tax_number;

    return {
      invoiceNumber: inv.invoice_number || `INV-${inv.id.slice(0, 6)}`,
      date: inv.date,
      type: (hasVat && hasBuyerTax) ? 'standard' : 'simplified',
      sellerName: pdfWaqfInfo.waqfName || 'وقف مرزوق بن علي الثبيتي',
      sellerAddress: pdfWaqfInfo.address,
      sellerVatNumber: pdfWaqfInfo.vatNumber,
      sellerCR: pdfWaqfInfo.commercialReg,
      sellerLogo: pdfWaqfInfo.logoUrl,
      buyerName: contract?.tenant_name || inv.contract?.tenant_name || '-',
      buyerVatNumber: contract?.tenant_tax_number || undefined,
      buyerCR: contract?.tenant_crn || undefined,
      buyerIdType: contract?.tenant_id_type || undefined,
      buyerIdNumber: contract?.tenant_id_number || undefined,
      buyerStreet: contract?.tenant_street || undefined,
      buyerDistrict: contract?.tenant_district || undefined,
      buyerCity: contract?.tenant_city || undefined,
      buyerPostalCode: contract?.tenant_postal_code || undefined,
      buyerBuilding: contract?.tenant_building || undefined,
      items: [{
        description: `${INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type}${inv.description ? ` — ${inv.description}` : ''}`,
        quantity: 1,
        unitPrice: safeNumber(inv.vat_amount) > 0
          ? safeNumber(inv.amount) - safeNumber(inv.vat_amount)
          : (safeNumber(inv.vat_rate) > 0 ? safeNumber(inv.amount) / (1 + safeNumber(inv.vat_rate) / 100) : safeNumber(inv.amount)),
        vatRate: safeNumber(inv.vat_rate),
      }],
      notes: inv.description || undefined,
      status: inv.status,
      bankName: pdfWaqfInfo.bankName,
      bankIBAN: pdfWaqfInfo.bankIBAN,
      zatcaUuid: inv.zatca_uuid || undefined,
      zatcaStatus: inv.zatca_status || undefined,
    };
  };

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // HIGH-1: ثوابت ALLOWED_MIME_TYPES و MAX_FILE_SIZE مستوردة من useInvoices
  const ITEMS_PER_PAGE = 10;

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
    // تحرير الـ URL القديم قبل إنشاء جديد لمنع تسريب الذاكرة
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const [formData, setFormData] = useState({
    invoice_number: '', invoice_type: '', amount: '', date: '',
    property_id: '', contract_id: '', description: '', status: 'pending',
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
      invoice_number: item.invoice_number || '', invoice_type: item.invoice_type,
      amount: item.amount.toString(), date: item.date, property_id: item.property_id || '',
      contract_id: item.contract_id || '', description: item.description || '', status: item.status,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoice_type || !formData.date) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    if (!editingInvoice && !selectedFile) { toast.error('يرجى رفع ملف الفاتورة'); return; }
    // INV-MED-3: منع إنشاء فاتورة بمبلغ صفر
    if (!(parseFloat(formData.amount) > 0)) { toast.error('يرجى إدخال مبلغ أكبر من صفر'); return; }

    try {
      setUploading(true);
      const invoiceData: Record<string, unknown> = {
        invoice_number: formData.invoice_number || null, invoice_type: formData.invoice_type,
        amount: parseFloat(formData.amount) || 0, date: formData.date,
        property_id: formData.property_id || null, contract_id: formData.contract_id || null,
        description: sanitizeDescription(formData.description) || null, status: formData.status,
      };
      if (!editingInvoice && fiscalYear?.id) invoiceData.fiscal_year_id = fiscalYear.id;

      if (selectedFile) {
        // INV-CRIT-4: تغليف حذف الملف القديم بـ try/catch — فشل الحذف لا يوقف الحفظ
        if (editingInvoice?.file_path) {
          try { await supabase.storage.from('invoices').remove([editingInvoice.file_path]); } catch { /* تجاهل فشل الحذف */ }
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

      const viewablePath = filePath || editingInvoice?.file_path;
      const viewableName = fileName || editingInvoice?.file_name;
      if (viewablePath) {
        toast.success(editingInvoice ? 'تم تحديث الفاتورة بنجاح' : 'تم رفع الفاتورة بنجاح', {
          action: { label: 'عرض', onClick: () => setViewerFile({ path: viewablePath, name: viewableName || null }) },
        });
      }
    } catch {
      toast.error('حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInvoice.mutateAsync({ id: deleteTarget.id, file_path: deleteTarget.file_path });
      setDeleteTarget(null);
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      // Filter by type
      if (filterType !== 'all' && item.invoice_type !== filterType) return false;
      // Filter by status
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      // Filter by search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (item.invoice_number || '').toLowerCase().includes(q) || (INVOICE_TYPE_LABELS[item.invoice_type] || '').includes(q) ||
          (item.description || '').toLowerCase().includes(q) || (item.file_name || '').toLowerCase().includes(q) || item.date.includes(q);
      }
      return true;
    });
  }, [invoices, filterType, filterStatus, searchQuery]);

  const statusBadgeVariant = (status: string) => {
    if (status === 'paid') return 'default';
    if (status === 'cancelled') return 'destructive';
    return 'secondary';
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة الفواتير"
          icon={FileText}
          description="إدارة وإصدار الفواتير الضريبية — يمكنك إنشاء فاتورة من قالب أو رفع فاتورة موجودة"
          actions={<>
            <Button variant="outline" className="gap-2" onClick={() => setTemplateOpen(true)} disabled={isClosed}>
              <FileText className="w-4 h-4" />إنشاء من قالب
            </Button>
            {(() => {
              const withoutFiles = invoices.filter(inv => !inv.file_path);
              return withoutFiles.length > 0 ? (
                <Button variant="outline" className="gap-2" disabled={generatePdf.isPending || isClosed} onClick={() => generatePdf.mutate(withoutFiles.map(inv => inv.id))}>
                  <FileDown className="w-4 h-4" />{generatePdf.isPending ? 'جاري التوليد...' : `توليد PDF (${withoutFiles.length})`}
                </Button>
              ) : null;
            })()}
            <ExportMenu onExportPdf={async () => {
              if (!fiscalYearId) {
                toast.warning('⚠️ أنت تصدّر فواتير جميع السنوات المالية. لتصدير سنة محددة، اخترها من منتقي السنة المالية.');
              }
              try {
                const fyLabel = fiscalYear?.label || (fiscalYearId ? '' : 'جميع السنوات');
                await generateInvoicesViewPDF(filteredInvoices.map(inv => ({
                  invoice_type: INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
                  invoice_number: inv.invoice_number, amount: safeNumber(inv.amount), date: inv.date,
                  property_number: inv.property?.property_number || '-', status: inv.status,
                })), pdfWaqfInfo, fyLabel);
                toast.success('تم تحميل ملف PDF بنجاح');
              } catch { toast.error('حدث خطأ أثناء تصدير PDF'); }
            }} />
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2" disabled={isClosed}><Plus className="w-4 h-4" /><span className="hidden sm:inline">رفع فاتورة</span></Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingInvoice ? 'تعديل الفاتورة' : 'رفع فاتورة جديدة'}</DialogTitle><DialogDescription className="sr-only">نموذج رفع أو تعديل فاتورة</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{editingInvoice ? 'تغيير ملف الفاتورة (اختياري)' : 'ملف الفاتورة (صورة أو PDF) *'}</Label>
                    <div
                      className={`border-2 rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5 border-solid' : 'border-dashed hover:border-primary/50'}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) validateAndSetFile(file); }}
                    >
                      {previewUrl && selectedFile ? (
                        <div className="relative inline-block">
                          <img src={previewUrl} alt="معاينة" className="max-h-32 rounded-md mx-auto object-contain" />
                          <button type="button" className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <p className="text-xs text-muted-foreground mt-1">{selectedFile.name}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">اضغط أو اسحب ملف هنا</p>
                          <p className="text-xs text-muted-foreground">صور (JPG, PNG) أو PDF — حد أقصى 10 ميجا</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) validateAndSetFile(file); }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>رقم الفاتورة</Label><Input value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} placeholder="INV-001" /></div>
                    <div className="space-y-2"><Label>المبلغ (ر.س) *</Label><Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="10000" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>التاريخ *</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                    <div className="space-y-2">
                      <Label>نوع الفاتورة *</Label>
                      <NativeSelect value={formData.invoice_type} onValueChange={(v) => setFormData({ ...formData, invoice_type: v })} placeholder="اختر النوع" options={Object.entries(INVOICE_TYPE_LABELS).map(([key, label]) => ({ value: key, label }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>العقار (اختياري)</Label>
                    <NativeSelect value={formData.property_id} onValueChange={(v) => setFormData({ ...formData, property_id: v })} placeholder="اختر العقار" options={properties.map((p) => ({ value: p.id, label: `${p.property_number} - ${p.location}` }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>العقد (اختياري)</Label>
                    <NativeSelect value={formData.contract_id} onValueChange={(v) => setFormData({ ...formData, contract_id: v })} placeholder="اختر العقد" options={contracts.map((c) => ({ value: c.id, label: `${c.contract_number} - ${c.tenant_name}` }))} />
                  </div>
                  <div className="space-y-2"><Label>وصف</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف إضافي" /></div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary" disabled={uploading || createInvoice.isPending || updateInvoice.isPending}>{uploading ? 'جاري الحفظ...' : editingInvoice ? 'تحديث' : 'رفع الفاتورة'}</Button>
                    <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>}
        />

        {isClosed && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
              <AlertTriangle className="w-4 h-4" />
              السنة المالية مقفلة — لا يمكن إضافة أو تعديل الفواتير
            </span>
          </div>
        )}

        <InvoiceSummaryCards invoices={invoices} isLoading={isLoading} />

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث في الفواتير..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
          </div>
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="نوع الفاتورة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {Object.entries(INVOICE_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {Object.entries(INVOICE_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 border rounded-lg p-1 self-center">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="gap-1"><List className="w-4 h-4" /><span className="hidden sm:inline">جدول</span></Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="gap-1"><LayoutGrid className="w-4 h-4" /><span className="hidden sm:inline">شبكي</span></Button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <InvoiceGridView invoices={filteredInvoices} onEdit={handleEdit} readOnly={isClosed} />
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <TableSkeleton rows={5} cols={5} />
              ) : filteredInvoices.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{searchQuery || filterType !== 'all' || filterStatus !== 'all' ? 'لا توجد نتائج مطابقة للفلاتر' : 'لا توجد فواتير مرفوعة'}</p>
                </div>
              ) : (
                <>
                  <MobileCardView
                    items={filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                    getKey={(item) => item.id}
                    getTitle={(item) => INVOICE_TYPE_LABELS[item.invoice_type] || item.invoice_type}
                    getSubtitle={(item) => item.invoice_number || undefined}
                    getBadge={(item) => <Badge variant={statusBadgeVariant(item.status)}>{INVOICE_STATUS_LABELS[item.status] || item.status}</Badge>}
                    getFields={(item) => [
                      { label: 'المبلغ', value: `${safeNumber(item.amount).toLocaleString()} ر.س` },
                      { label: 'التاريخ', value: item.date },
                      { label: 'العقار', value: item.property?.property_number || '-' },
                      { label: 'الملف', value: item.file_path ? (item.file_name || 'موجود') : 'لا يوجد' },
                    ]}
                    onEdit={isClosed ? undefined : handleEdit}
                    onDelete={isClosed ? undefined : (item) => setDeleteTarget({ id: item.id, name: item.file_name || 'فاتورة', file_path: item.file_path })}
                    extraActions={(item) => item.file_path ? (
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setViewerFile({ path: item.file_path!, name: item.file_name })} aria-label="عرض الملف">
                        <Eye className="w-4 h-4" />
                      </Button>
                    ) : null}
                  />

                  <div className="overflow-x-auto hidden md:block"><Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">النوع</TableHead><TableHead className="text-right">رقم الفاتورة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead><TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">العقار</TableHead><TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الملف</TableHead><TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{INVOICE_TYPE_LABELS[item.invoice_type] || item.invoice_type}</TableCell>
                          <TableCell>{item.invoice_number || '-'}</TableCell>
                          <TableCell className="font-medium">{safeNumber(item.amount).toLocaleString()} ر.س</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.property?.property_number || '-'}</TableCell>
                          <TableCell><Badge variant={statusBadgeVariant(item.status)}>{INVOICE_STATUS_LABELS[item.status] || item.status}</Badge></TableCell>
                          <TableCell>
                            {item.file_path ? (
                              <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => setViewerFile({ path: item.file_path!, name: item.file_name })}>
                                <Eye className="w-4 h-4" /><span className="text-xs truncate max-w-[80px]">{item.file_name}</span>
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="gap-1 text-warning" disabled={generatePdf.isPending} onClick={() => generatePdf.mutate([item.id])}>
                                <FileDown className="w-4 h-4" /><span className="text-xs">توليد PDF</span>
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setPreviewInvoice(buildPreviewData(item))} aria-label="معاينة"><Eye className="w-4 h-4 text-primary" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={isClosed} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: item.id, name: item.file_name || 'فاتورة', file_path: item.file_path })} className="text-destructive hover:text-destructive" disabled={isClosed} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                </>
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
        <InvoiceViewer open={!!viewerFile} onOpenChange={(open) => !open && setViewerFile(null)} filePath={viewerFile?.path || null} fileName={viewerFile?.name || null} />
        <InvoicePreviewDialog
          open={!!previewInvoice}
          onOpenChange={(open) => !open && setPreviewInvoice(null)}
          invoice={previewInvoice}
          onDownloadPdf={() => {
            const origInv = invoices.find(i =>
              (i.invoice_number && i.invoice_number === previewInvoice?.invoiceNumber) ||
              `INV-${i.id.slice(0, 6)}` === previewInvoice?.invoiceNumber
            );
            if (origInv) generatePdf.mutate([origInv.id]);
          }}
        />
        <CreateInvoiceFromTemplate
          open={templateOpen}
          onOpenChange={setTemplateOpen}
          contracts={contracts}
          properties={properties}
          sellerInfo={{
            name: pdfWaqfInfo.waqfName || 'وقف مرزوق بن علي الثبيتي',
            address: pdfWaqfInfo.address,
            vatNumber: pdfWaqfInfo.vatNumber,
            commercialReg: pdfWaqfInfo.commercialReg,
            bankName: pdfWaqfInfo.bankName,
            bankIBAN: pdfWaqfInfo.bankIBAN,
          }}
          onSave={async (data) => {
            await createInvoice.mutateAsync({
              ...data,
              fiscal_year_id: fiscalYear?.id,
            } as unknown as Parameters<typeof createInvoice.mutateAsync>[0]);
            setTemplateOpen(false);
            toast.success('تم إنشاء الفاتورة بنجاح');
          }}
          isSaving={createInvoice.isPending}
        />
      </div>
    </DashboardLayout>
  );
};

export default InvoicesPage;
