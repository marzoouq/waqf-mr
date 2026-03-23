import DashboardLayout from '@/components/DashboardLayout';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import InvoiceViewer from '@/components/invoices/InvoiceViewer';
import InvoicePreviewDialog from '@/components/invoices/InvoicePreviewDialog';
import CreateInvoiceFromTemplate from '@/components/invoices/CreateInvoiceFromTemplate';
import InvoiceGridView from '@/components/invoices/InvoiceGridView';
import InvoiceSummaryCards from '@/components/invoices/InvoiceSummaryCards';
import TablePagination from '@/components/TablePagination';
import MobileCardView from '@/components/MobileCardView';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, FileText, Search, Upload, Eye, Edit, LayoutGrid, List, FileDown, X, AlertTriangle } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import ExportMenu from '@/components/ExportMenu';
import { generateInvoicesViewPDF } from '@/utils/pdf';
import { buildCsv, downloadCsv } from '@/utils/csv';
import { toast } from 'sonner';
import { safeNumber } from '@/utils/safeNumber';
import { fmt } from '@/utils/format';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useInvoicesPage } from '@/hooks/page/useInvoicesPage';

const InvoicesPage = () => {
  const h = useInvoicesPage();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة الفواتير"
          icon={FileText}
          description="إدارة وإصدار الفواتير الضريبية — يمكنك إنشاء فاتورة من قالب أو رفع فاتورة موجودة"
          actions={<>
            <Button variant="outline" className="gap-2" onClick={() => h.setTemplateOpen(true)} disabled={h.isClosed}>
              <FileText className="w-4 h-4" />إنشاء من قالب
            </Button>
            {(() => {
              const withoutFiles = h.invoices.filter(inv => !inv.file_path);
              return withoutFiles.length > 0 ? (
                <Button variant="outline" className="gap-2" disabled={h.generatePdf.isPending || h.isClosed} onClick={() => h.generatePdf.mutate(withoutFiles.map(inv => inv.id))}>
                  <FileDown className="w-4 h-4" />{h.generatePdf.isPending ? 'جاري التوليد...' : `توليد PDF (${withoutFiles.length})`}
                </Button>
              ) : null;
            })()}
            <ExportMenu onExportPdf={async () => {
              if (!h.fiscalYearId) {
                toast.warning('⚠️ أنت تصدّر فواتير جميع السنوات المالية. لتصدير سنة محددة، اخترها من منتقي السنة المالية.');
              }
              try {
                const fyLabel = h.fiscalYear?.label || (h.fiscalYearId ? '' : 'جميع السنوات');
                await generateInvoicesViewPDF(h.filteredInvoices.map(inv => ({
                  invoice_type: h.INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
                  invoice_number: inv.invoice_number, amount: safeNumber(inv.amount), date: inv.date,
                  property_number: inv.property?.property_number || '-', status: inv.status,
                })), h.pdfWaqfInfo, fyLabel);
                toast.success('تم تحميل ملف PDF بنجاح');
              } catch { toast.error('حدث خطأ أثناء تصدير PDF'); }
            }} onExportCsv={() => {
              const fyLabel = h.fiscalYear?.label || 'جميع-السنوات';
              const csv = buildCsv(h.filteredInvoices.map(inv => ({
                'النوع': h.INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
                'رقم الفاتورة': inv.invoice_number || '-',
                'المبلغ': safeNumber(inv.amount),
                'التاريخ': inv.date,
                'العقار': inv.property?.property_number || '-',
                'الحالة': h.INVOICE_STATUS_LABELS[inv.status] || inv.status,
              })));
              downloadCsv(csv, `فواتير-${fyLabel}.csv`);
              toast.success('تم تصدير الفواتير بنجاح');
            }} />
            <Dialog open={h.isOpen} onOpenChange={(open) => { h.setIsOpen(open); if (!open) h.resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2" disabled={h.isClosed}><Plus className="w-4 h-4" /><span className="hidden sm:inline">رفع فاتورة</span></Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{h.editingInvoice ? 'تعديل الفاتورة' : 'رفع فاتورة جديدة'}</DialogTitle><DialogDescription className="sr-only">نموذج رفع أو تعديل فاتورة</DialogDescription></DialogHeader>
                <form onSubmit={h.handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{h.editingInvoice ? 'تغيير ملف الفاتورة (اختياري)' : 'ملف الفاتورة (صورة أو PDF) *'}</Label>
                    <div
                      className={`border-2 rounded-lg p-6 text-center cursor-pointer transition-colors ${h.isDragging ? 'border-primary bg-primary/5 border-solid' : 'border-dashed hover:border-primary/50'}`}
                      onClick={() => h.fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); h.setIsDragging(true); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); h.setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); h.setIsDragging(false); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); h.setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) h.validateAndSetFile(file); }}
                    >
                      {h.previewUrl && h.selectedFile ? (
                        <div className="relative inline-block">
                          <img src={h.previewUrl} alt="معاينة" className="max-h-32 rounded-md mx-auto object-contain" />
                          <button type="button" className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5" onClick={(e) => { e.stopPropagation(); h.resetForm(); }}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <p className="text-xs text-muted-foreground mt-1">{h.selectedFile.name}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">اضغط أو اسحب ملف هنا</p>
                          <p className="text-xs text-muted-foreground">صور (JPG, PNG) أو PDF — حد أقصى 10 ميجا</p>
                        </div>
                      )}
                    </div>
                    <input ref={h.fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) h.validateAndSetFile(file); }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>رقم الفاتورة</Label><Input value={h.formData.invoice_number} onChange={(e) => h.setFormData({ ...h.formData, invoice_number: e.target.value })} placeholder="INV-001" /></div>
                    <div className="space-y-2"><Label>المبلغ (ر.س) *</Label><Input type="number" value={h.formData.amount} onChange={(e) => h.setFormData({ ...h.formData, amount: e.target.value })} placeholder="10000" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>التاريخ *</Label><Input type="date" value={h.formData.date} onChange={(e) => h.setFormData({ ...h.formData, date: e.target.value })} /></div>
                    <div className="space-y-2">
                      <Label>نوع الفاتورة *</Label>
                      <NativeSelect value={h.formData.invoice_type} onValueChange={(v) => h.setFormData({ ...h.formData, invoice_type: v })} placeholder="اختر النوع" options={Object.entries(h.INVOICE_TYPE_LABELS).map(([key, label]) => ({ value: key, label }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>العقار (اختياري)</Label>
                    <NativeSelect value={h.formData.property_id} onValueChange={(v) => h.setFormData({ ...h.formData, property_id: v })} placeholder="اختر العقار" options={h.properties.map((p) => ({ value: p.id, label: `${p.property_number} - ${p.location}` }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>العقد (اختياري)</Label>
                    <NativeSelect value={h.formData.contract_id} onValueChange={(v) => h.setFormData({ ...h.formData, contract_id: v })} placeholder="اختر العقد" options={h.contracts.map((c) => ({ value: c.id, label: `${c.contract_number} - ${c.tenant_name}` }))} />
                  </div>
                  <div className="space-y-2"><Label>وصف</Label><Input value={h.formData.description} onChange={(e) => h.setFormData({ ...h.formData, description: e.target.value })} placeholder="وصف إضافي" /></div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary" disabled={h.uploading || h.createInvoice.isPending || h.updateInvoice.isPending}>{h.uploading ? 'جاري الحفظ...' : h.editingInvoice ? 'تحديث' : 'رفع الفاتورة'}</Button>
                    <Button type="button" variant="outline" onClick={() => { h.setIsOpen(false); h.resetForm(); }}>إلغاء</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>}
        />

        {h.isClosed && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
              <AlertTriangle className="w-4 h-4" />السنة المالية مقفلة — لا يمكن إضافة أو تعديل الفواتير
            </span>
          </div>
        )}

        <InvoiceSummaryCards invoices={h.invoices} isLoading={h.isLoading} />

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث في الفواتير..." value={h.searchQuery} onChange={(e) => { h.setSearchQuery(e.target.value); h.setCurrentPage(1); }} className="pr-10" />
          </div>
          <Select value={h.filterType} onValueChange={(v) => { h.setFilterType(v); h.setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="نوع الفاتورة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {Object.entries(h.INVOICE_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={h.filterStatus} onValueChange={(v) => { h.setFilterStatus(v); h.setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {Object.entries(h.INVOICE_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 border rounded-lg p-1 self-center">
            <Button variant={h.viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => h.setViewMode('table')} className="gap-1"><List className="w-4 h-4" /><span className="hidden sm:inline">جدول</span></Button>
            <Button variant={h.viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => h.setViewMode('grid')} className="gap-1"><LayoutGrid className="w-4 h-4" /><span className="hidden sm:inline">شبكي</span></Button>
          </div>
        </div>

        {h.viewMode === 'grid' ? (
          <InvoiceGridView invoices={h.filteredInvoices} onEdit={h.handleEdit} readOnly={h.isClosed} />
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {h.isLoading ? (
                <TableSkeleton rows={5} cols={5} />
              ) : h.filteredInvoices.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{h.searchQuery || h.filterType !== 'all' || h.filterStatus !== 'all' ? 'لا توجد نتائج مطابقة للفلاتر' : 'لا توجد فواتير مرفوعة'}</p>
                </div>
              ) : (
                <>
                  <MobileCardView
                    items={h.filteredInvoices.slice((h.currentPage - 1) * h.ITEMS_PER_PAGE, h.currentPage * h.ITEMS_PER_PAGE)}
                    getKey={(item) => item.id}
                    getTitle={(item) => h.INVOICE_TYPE_LABELS[item.invoice_type] || item.invoice_type}
                    getSubtitle={(item) => item.invoice_number || undefined}
                    getBadge={(item) => <Badge variant={h.statusBadgeVariant(item.status)}>{h.INVOICE_STATUS_LABELS[item.status] || item.status}</Badge>}
                    getFields={(item) => [
                      { label: 'المبلغ', value: `${fmt(safeNumber(item.amount))} ر.س` },
                      { label: 'التاريخ', value: item.date },
                      { label: 'العقار', value: item.property?.property_number || '-' },
                      { label: 'الملف', value: item.file_path ? (item.file_name || 'موجود') : 'لا يوجد' },
                    ]}
                    onEdit={h.isClosed ? undefined : h.handleEdit}
                    onDelete={h.isClosed ? undefined : (item) => h.setDeleteTarget({ id: item.id, name: item.file_name || 'فاتورة', file_path: item.file_path })}
                    extraActions={(item) => item.file_path ? (
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => h.setViewerFile({ path: item.file_path!, name: item.file_name })} aria-label="عرض الملف">
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
                      {h.filteredInvoices.slice((h.currentPage - 1) * h.ITEMS_PER_PAGE, h.currentPage * h.ITEMS_PER_PAGE).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{h.INVOICE_TYPE_LABELS[item.invoice_type] || item.invoice_type}</TableCell>
                          <TableCell>{item.invoice_number || '-'}</TableCell>
                          <TableCell className="font-medium">{fmt(safeNumber(item.amount))} ر.س</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.property?.property_number || '-'}</TableCell>
                          <TableCell><Badge variant={h.statusBadgeVariant(item.status)}>{h.INVOICE_STATUS_LABELS[item.status] || item.status}</Badge></TableCell>
                          <TableCell>
                            {item.file_path ? (
                              <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => h.setViewerFile({ path: item.file_path!, name: item.file_name })}>
                                <Eye className="w-4 h-4" /><span className="text-xs truncate max-w-[80px]">{item.file_name}</span>
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="gap-1 text-warning" disabled={h.generatePdf.isPending} onClick={() => h.generatePdf.mutate([item.id])}>
                                <FileDown className="w-4 h-4" /><span className="text-xs">توليد PDF</span>
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => h.setPreviewInvoice(h.buildPreviewData(item))} aria-label="معاينة"><Eye className="w-4 h-4 text-primary" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => h.handleEdit(item)} disabled={h.isClosed} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => h.setDeleteTarget({ id: item.id, name: item.file_name || 'فاتورة', file_path: item.file_path })} className="text-destructive hover:text-destructive" disabled={h.isClosed} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                </>
              )}
              <TablePagination currentPage={h.currentPage} totalItems={h.filteredInvoices.length} itemsPerPage={h.ITEMS_PER_PAGE} onPageChange={h.setCurrentPage} />
            </CardContent>
          </Card>
        )}

        <AlertDialog open={!!h.deleteTarget} onOpenChange={(open) => !open && h.setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
              <AlertDialogDescription>سيتم حذف الفاتورة "{h.deleteTarget?.name}" نهائياً مع ملفها ولا يمكن التراجع.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={h.handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <InvoiceViewer open={!!h.viewerFile} onOpenChange={(open) => !open && h.setViewerFile(null)} filePath={h.viewerFile?.path || null} fileName={h.viewerFile?.name || null} />
        <InvoicePreviewDialog open={!!h.previewInvoice} onOpenChange={(open) => !open && h.setPreviewInvoice(null)} invoice={h.previewInvoice} />
        <CreateInvoiceFromTemplate
          open={h.templateOpen}
          onOpenChange={h.setTemplateOpen}
          contracts={h.contracts}
          properties={h.properties}
          sellerInfo={{
            name: h.pdfWaqfInfo.waqfName || 'وقف مرزوق بن علي الثبيتي',
            address: h.pdfWaqfInfo.address,
            vatNumber: h.pdfWaqfInfo.vatNumber,
            commercialReg: h.pdfWaqfInfo.commercialReg,
            bankName: h.pdfWaqfInfo.bankName,
            bankIBAN: h.pdfWaqfInfo.bankIBAN,
          }}
          onSave={async (data) => {
            await h.createInvoice.mutateAsync({
              ...data,
              fiscal_year_id: h.fiscalYear?.id,
            } as unknown as Parameters<typeof h.createInvoice.mutateAsync>[0]);
            h.setTemplateOpen(false);
            toast.success('تم إنشاء الفاتورة بنجاح');
          }}
          isSaving={h.createInvoice.isPending}
        />
      </div>
    </DashboardLayout>
  );
};

export default InvoicesPage;
