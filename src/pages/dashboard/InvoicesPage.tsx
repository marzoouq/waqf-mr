import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvoiceUploadDialog, InvoiceGridView, InvoiceSummaryCards, InvoicesDesktopTable } from '@/components/invoices';
import InvoicesPageDialogs from '@/components/invoices/InvoicesPageDialogs';
import { TablePagination, MobileCardView, ExportMenu, TableSkeleton } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Eye, LayoutGrid, List, FileDown, ShieldCheck, Lock } from 'lucide-react';
import { generateInvoicesViewPDF } from '@/utils/pdf';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { defaultNotify } from '@/lib/notify';
import { safeNumber } from '@/utils/format/safeNumber';
import { fmt } from '@/utils/format/format';
import { useInvoicesPage } from '@/hooks/page/admin/financial/useInvoicesPage';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { canModifyFiscalYear } from '@/utils/auth/permissions';

const InvoicesPage = () => {
  const h = useInvoicesPage();
  const { role } = useAuth();
  const isLocked = !canModifyFiscalYear(role, h.isClosed);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة الفواتير"
          icon={FileText}
          description="إدارة وإصدار الفواتير الضريبية — يمكنك إنشاء فاتورة من قالب أو رفع فاتورة موجودة"
          actions={<>
            <Button variant="outline" className="gap-2" onClick={() => h.setTemplateOpen(true)} disabled={isLocked}>
              <FileText className="w-4 h-4" />إنشاء من قالب
            </Button>
            {(() => {
              const withoutFiles = h.invoices.filter(inv => !inv.file_path);
              return withoutFiles.length > 0 ? (
                <Button variant="outline" className="gap-2" disabled={h.generatePdf.isPending || isLocked} onClick={() => h.generatePdf.mutate(withoutFiles.map(inv => inv.id))}>
                  <FileDown className="w-4 h-4" />{h.generatePdf.isPending ? 'جاري التوليد...' : `توليد PDF (${withoutFiles.length})`}
                </Button>
              ) : null;
            })()}
            <ExportMenu onExportPdf={async () => {
              if (!h.fiscalYearId || h.fiscalYearId === 'all') defaultNotify.warning('⚠️ أنت تصدّر فواتير جميع السنوات المالية.');
              try {
                const fyLabel = h.fiscalYear?.label || (h.fiscalYearId ? '' : 'جميع السنوات');
                await generateInvoicesViewPDF(h.filteredInvoices.map(inv => ({
                  invoice_type: h.INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
                  invoice_number: inv.invoice_number, amount: safeNumber(inv.amount), date: inv.date,
                  property_number: inv.property?.property_number || '-', status: inv.status,
                })), h.pdfWaqfInfo, fyLabel);
                defaultNotify.success('تم تحميل ملف PDF بنجاح');
              } catch { defaultNotify.error('حدث خطأ أثناء تصدير PDF'); }
            }} onExportCsv={() => {
              const fyLabel = h.fiscalYear?.label || 'جميع-السنوات';
              const csv = buildCsv(h.filteredInvoices.map(inv => ({
                'النوع': h.INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type,
                'رقم الفاتورة': inv.invoice_number || '-', 'المبلغ': safeNumber(inv.amount),
                'التاريخ': inv.date, 'العقار': inv.property?.property_number || '-',
                'الحالة': h.INVOICE_STATUS_LABELS[inv.status] || inv.status,
              })));
              downloadCsv(csv, `فواتير-${fyLabel}.csv`);
              defaultNotify.success('تم تصدير الفواتير بنجاح');
            }} />
            <InvoiceUploadDialog
              open={h.isOpen} onOpenChange={h.setIsOpen} isEditing={!!h.editingInvoice} isLocked={isLocked}
              formData={h.formData} setFormData={h.setFormData} onSubmit={h.handleSubmit} onReset={h.resetForm}
              isSaving={h.uploading || h.createInvoice.isPending || h.updateInvoice.isPending}
              fileInputRef={h.fileInputRef} selectedFile={h.selectedFile} previewUrl={h.previewUrl}
              isDragging={h.isDragging} setIsDragging={h.setIsDragging} validateAndSetFile={h.validateAndSetFile}
              typeLabels={h.INVOICE_TYPE_LABELS} properties={h.properties} contracts={h.contracts}
            />
          </>}
        />

        {h.isClosed && (
          <div className="flex flex-wrap items-center gap-4">
            {role === 'admin' ? (
              <span className="text-sm text-success font-medium flex items-center gap-1 bg-success/10 px-3 py-1 rounded-md border border-success/30">
                <ShieldCheck className="w-4 h-4" /> سنة مقفلة — لديك صلاحية التعديل كناظر
              </span>
            ) : (
              <span className="text-sm text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
                <Lock className="w-4 h-4" /> سنة مقفلة — لا يمكن التعديل
              </span>
            )}
          </div>
        )}

        <InvoiceSummaryCards invoices={h.invoices} isLoading={h.isLoading} />

        {/* شريط الفلاتر */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input name="search_query" placeholder="بحث في الفواتير..." value={h.searchQuery} onChange={(e) => { h.setSearchQuery(e.target.value); h.setCurrentPage(1); }} className="pr-10" />
          </div>
          <Select value={h.filterType} onValueChange={(v) => { h.setFilterType(v); h.setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="نوع الفاتورة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {Object.entries(h.INVOICE_TYPE_LABELS).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={h.filterStatus} onValueChange={(v) => { h.setFilterStatus(v); h.setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {Object.entries(h.INVOICE_STATUS_LABELS).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 border rounded-lg p-1 self-center">
            <Button variant={h.viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => h.setViewMode('table')} className="gap-1"><List className="w-4 h-4" /><span className="hidden sm:inline">جدول</span></Button>
            <Button variant={h.viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => h.setViewMode('grid')} className="gap-1"><LayoutGrid className="w-4 h-4" /><span className="hidden sm:inline">شبكي</span></Button>
          </div>
        </div>

        {/* عرض الفواتير */}
        {h.viewMode === 'grid' ? (
          <InvoiceGridView invoices={h.filteredInvoices} onEdit={h.handleEdit} readOnly={isLocked} />
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
                    getKey={(item) => item.id} getTitle={(item) => h.INVOICE_TYPE_LABELS[item.invoice_type] || item.invoice_type}
                    getSubtitle={(item) => item.invoice_number || undefined}
                    getBadge={(item) => <Badge variant={h.statusBadgeVariant(item.status)}>{h.INVOICE_STATUS_LABELS[item.status] || item.status}</Badge>}
                    getFields={(item) => [
                      { label: 'المبلغ', value: `${fmt(safeNumber(item.amount))} ر.س` }, { label: 'التاريخ', value: item.date },
                      { label: 'العقار', value: item.property?.property_number || '-' },
                      { label: 'الملف', value: item.file_path ? (item.file_name || 'موجود') : 'لا يوجد' },
                    ]}
                    onEdit={isLocked ? undefined : h.handleEdit}
                    onDelete={isLocked ? undefined : (item) => h.setDeleteTarget({ id: item.id, name: item.file_name || 'فاتورة', file_path: item.file_path })}
                    extraActions={(item) => item.file_path ? (
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => h.setViewerFile({ path: item.file_path!, name: item.file_name })} aria-label="عرض الملف"><Eye className="w-4 h-4" /></Button>
                    ) : null}
                  />
                  <InvoicesDesktopTable
                    items={h.filteredInvoices.slice((h.currentPage - 1) * h.ITEMS_PER_PAGE, h.currentPage * h.ITEMS_PER_PAGE)}
                    isLocked={isLocked} generatePdfPending={h.generatePdf.isPending}
                    typeLabels={h.INVOICE_TYPE_LABELS} statusLabels={h.INVOICE_STATUS_LABELS} statusBadgeVariant={h.statusBadgeVariant}
                    onViewFile={h.setViewerFile} onGeneratePdf={(ids) => h.generatePdf.mutate(ids)}
                    onPreview={(item) => h.setPreviewInvoice(h.buildPreviewData(item))}
                    onEdit={h.handleEdit} onDelete={h.setDeleteTarget}
                  />
                </>
              )}
              <TablePagination currentPage={h.currentPage} totalItems={h.filteredInvoices.length} itemsPerPage={h.ITEMS_PER_PAGE} onPageChange={h.setCurrentPage} />
            </CardContent>
          </Card>
        )}

        <InvoicesPageDialogs
          deleteTarget={h.deleteTarget} setDeleteTarget={h.setDeleteTarget} onConfirmDelete={h.handleConfirmDelete}
          viewerFile={h.viewerFile} setViewerFile={h.setViewerFile}
          previewInvoice={h.previewInvoice} setPreviewInvoice={h.setPreviewInvoice}
          templateOpen={h.templateOpen} setTemplateOpen={h.setTemplateOpen}
          contracts={h.contracts} properties={h.properties}
          sellerInfo={{
            name: h.pdfWaqfInfo.waqfName || 'وقف مرزوق بن علي الثبيتي',
            address: h.pdfWaqfInfo.address, vatNumber: h.pdfWaqfInfo.vatNumber,
            commercialReg: h.pdfWaqfInfo.commercialReg, bankName: h.pdfWaqfInfo.bankName, bankIBAN: h.pdfWaqfInfo.bankIBAN,
          }}
          onSaveTemplate={async (data) => {
            await h.createInvoice.mutateAsync({ ...data, fiscal_year_id: h.fiscalYear?.id } as unknown as Parameters<typeof h.createInvoice.mutateAsync>[0]);
            h.setTemplateOpen(false);
            defaultNotify.success('تم إنشاء الفاتورة بنجاح');
          }}
          isSaving={h.createInvoice.isPending}
        />
      </div>
    </DashboardLayout>
  );
};

export default InvoicesPage;
