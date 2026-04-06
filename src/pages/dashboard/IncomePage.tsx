import { fmt } from '@/utils/format/format';
import { lazy, Suspense } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
const IncomeMonthlyChart = lazy(() => import('@/components/dashboard/IncomeMonthlyChart'));
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp, Search, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import IncomeSummaryCards from '@/components/income/IncomeSummaryCards';
import IncomeMobileCards from '@/components/income/IncomeMobileCards';
import IncomeDesktopTable from '@/components/income/IncomeDesktopTable';
import { TablePagination, ExportMenu, TableSkeleton } from '@/components/common';
import AdvancedFiltersBar from '@/components/filters/AdvancedFiltersBar';
import { generateIncomePDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { defaultNotify } from '@/lib/notify';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIncomePage } from '@/hooks/page/admin/useIncomePage';

const IncomePage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const {
    income, isLoading, properties, contracts, paymentInvoices,
    fiscalYearId, fiscalYear, isClosed, role, isLocked,
    isOpen, setIsOpen, editingIncome, formData, setFormData,
    resetForm, handleEdit, handleSubmit,
    createPending, updatePending,
    deleteTarget, setDeleteTarget, handleConfirmDelete,
    sortField, sortDir, handleSort,
    searchQuery, setSearchQuery, filters, setFilters,
    currentPage, setCurrentPage, ITEMS_PER_PAGE,
    totalIncome, uniqueSources, lowIncomeMonths, summaryCards, filteredIncome,
  } = useIncomePage();

  const paginatedItems = filteredIncome.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <DashboardLayout>
       <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة الدخل"
          icon={TrendingUp}
          description="تسجيل ومتابعة مصادر الدخل"
          actions={<>
            <ExportMenu onExportPdf={() => generateIncomePDF(filteredIncome, totalIncome, pdfWaqfInfo)} onExportCsv={() => {
              const csv = buildCsv(filteredIncome.map(item => ({
                'المصدر': item.source,
                'المبلغ': safeNumber(item.amount),
                'التاريخ': item.date,
                'العقار': item.property?.property_number || '-',
                'ملاحظات': item.notes || '-',
              })));
              downloadCsv(csv, 'دخل.csv');
              defaultNotify.success('تم تصدير الدخل بنجاح');
            }} />
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild><Button className="gradient-primary gap-2" disabled={isLocked}><Plus className="w-4 h-4" /><span className="hidden sm:inline">إضافة دخل</span></Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingIncome ? 'تعديل الدخل' : 'إضافة دخل جديد'}</DialogTitle><DialogDescription className="sr-only">نموذج إضافة أو تعديل دخل</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="income-source">المصدر *</Label><Input id="income-source" name="income-source" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} placeholder="إيجار، استثمار، تبرع..." /></div>
                  <div className="space-y-2"><Label htmlFor="income-amount">المبلغ (ر.س) *</Label><Input id="income-amount" name="income-amount" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="10000" /></div>
                  <div className="space-y-2"><Label htmlFor="income-date">التاريخ *</Label><Input id="income-date" name="income-date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label htmlFor="income-property">العقار (اختياري)</Label>
                    <NativeSelect id="income-property" value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })} placeholder="اختر العقار" options={properties.map((p) => ({ value: p.id, label: `${p.property_number} - ${p.location}` }))} />
                  </div>
                  <div className="space-y-2"><Label htmlFor="income-notes">ملاحظات</Label><Input id="income-notes" name="income-notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية" /></div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary" disabled={createPending || updatePending}>{editingIncome ? 'تحديث' : 'إضافة'}</Button>
                    <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>}
        />

        {isClosed && (
          <div className="flex flex-wrap items-center gap-4">
            {role === 'admin' ? (
              <span className="text-sm text-success font-medium flex items-center gap-1 bg-success/10 px-3 py-1 rounded-md border border-success/30">
                <ShieldCheck className="w-3 h-3" /> سنة مقفلة — لديك صلاحية التعديل كناظر
              </span>
            ) : (
              <span className="text-sm text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-3 py-1 rounded-md border border-warning/30">
                <Lock className="w-3 h-3" /> سنة مقفلة — لا يمكن التعديل
              </span>
            )}
          </div>
        )}

        <IncomeSummaryCards isLoading={isLoading} totalIncome={totalIncome} summaryCards={summaryCards} />

        {/* رسم بياني الدخل الشهري */}
        {!isLoading && income.length > 0 && (
          <Suspense fallback={<Skeleton className="h-[320px]" />}>
            <IncomeMonthlyChart income={income} contracts={contracts} fiscalYear={fiscalYear} isSpecificYear={!!(fiscalYearId && fiscalYearId !== 'all')} paymentInvoices={paymentInvoices} />
          </Suspense>
        )}

        {/* تنبيه الإيراد الناقص */}
        {!isLoading && lowIncomeMonths.length > 0 && (
          <Card className="shadow-sm border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-warning">تنبيه: إيرادات منخفضة في {lowIncomeMonths.length} {lowIncomeMonths.length === 1 ? 'شهر' : 'أشهر'}</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {lowIncomeMonths.map((m) => (
                      <p key={m.month}>
                        شهر <span className="font-medium">{m.month}</span>: {fmt(m.amount)} ر.س
                        <span className="text-destructive"> (أقل من 20% من المتوسط: {fmt(m.avg)} ر.س)</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* بحث + فلاتر */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="income-search" name="income-search" aria-label="بحث" placeholder="بحث في سجلات الدخل..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
          </div>
          <AdvancedFiltersBar
            filters={filters}
            onFiltersChange={(f) => { setFilters(f); setCurrentPage(1); }}
            categories={uniqueSources}
            categoryLabel="المصادر"
            categoryPlaceholder="كل المصادر"
            properties={properties}
          />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : filteredIncome.length === 0 ? (
              <div className="py-12 text-center"><TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{searchQuery || filters.category || filters.propertyId || filters.dateFrom ? 'لا توجد نتائج للبحث' : 'لا توجد سجلات دخل'}</p></div>
            ) : (
              <>
              <IncomeMobileCards items={paginatedItems} isLocked={isLocked} onEdit={handleEdit} onDelete={setDeleteTarget} />
              <IncomeDesktopTable items={paginatedItems} isLocked={isLocked} sortField={sortField} sortDir={sortDir} onSort={handleSort} onEdit={handleEdit} onDelete={setDeleteTarget} />
              </>
            )}
            <TablePagination currentPage={currentPage} totalItems={filteredIncome.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
              <AlertDialogDescription>سيتم حذف {deleteTarget?.name} نهائياً ولا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default IncomePage;
