import React from 'react';
import { safeNumber } from '@/utils/safeNumber';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import { Trash2, TrendingDown, Edit, Search, Paperclip, ChevronDown, ChevronUp, Lock, ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import { buildCsv, downloadCsv } from '@/utils/csv';
import ExpenseAttachments from '@/components/expenses/ExpenseAttachments';
import ExpenseSummaryCards from '@/components/expenses/ExpenseSummaryCards';
import ExpenseFormDialog from '@/components/expenses/ExpenseFormDialog';
import AdvancedFiltersBar from '@/components/filters/AdvancedFiltersBar';
import ExpensesPieChart from '@/components/expenses/ExpensesPieChart';
import ExpenseBudgetBar from '@/components/expenses/ExpenseBudgetBar';
import { generateExpensesPDF } from '@/utils/pdf';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fmt } from '@/utils/format';
import { useExpensesPage, type SortField } from '@/hooks/page/useExpensesPage';

const ExpensesPage = () => {
  const h = useExpensesPage();

  const SortIcon = ({ field }: { field: SortField }) => {
    if (h.sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return h.sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة المصروفات"
          icon={TrendingDown}
          description="تسجيل ومتابعة المصروفات"
          actions={<>
            <ExportMenu onExportPdf={() => generateExpensesPDF(h.filteredExpenses, h.totalExpenses, h.pdfWaqfInfo)} onExportCsv={() => {
              const csv = buildCsv(h.filteredExpenses.map(item => ({
                'النوع': item.expense_type, 'المبلغ': safeNumber(item.amount), 'التاريخ': item.date,
                'العقار': item.property?.property_number || '-', 'الوصف': item.description || '-',
              })));
              downloadCsv(csv, 'مصروفات.csv');
              toast.success('تم تصدير المصروفات بنجاح');
            }} />
            <ExpenseFormDialog
              isOpen={h.isOpen} setIsOpen={h.setIsOpen} formData={h.formData} setFormData={h.setFormData}
              isEditing={!!h.editingExpense} isPending={h.createExpense.isPending || h.updateExpense.isPending}
              properties={h.properties} onSubmit={h.handleSubmit} onReset={h.resetForm} disabled={h.isLocked}
            />
          </>}
        />

        {h.isClosed && (
          <div className="flex flex-wrap items-center gap-4">
            {h.role === 'admin' ? (
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

        <ExpenseSummaryCards expenses={h.expenses} totalExpenses={h.totalExpenses} documentedCount={h.documentedCount} documentationRate={h.documentationRate} isLoading={h.isLoading} />
        <ExpensesPieChart expenses={h.expenses} isLoading={h.isLoading} />
        <ExpenseBudgetBar expenses={h.expenses} fiscalYearId={h.fiscalYearId} isClosed={h.isLocked} />

        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="expenses-search" name="expenses-search" aria-label="بحث" placeholder="بحث في المصروفات..." value={h.searchQuery} onChange={(e) => { h.setSearchQuery(e.target.value); h.setCurrentPage(1); }} className="pr-10" />
          </div>
          <AdvancedFiltersBar
            filters={h.filters}
            onFiltersChange={(f) => { h.setFilters(f); h.setCurrentPage(1); }}
            categories={h.uniqueTypes}
            categoryLabel="الأنواع"
            categoryPlaceholder="كل الأنواع"
            properties={h.properties}
          />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {h.isLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : h.filteredExpenses.length === 0 ? (
              <div className="py-12 text-center"><TrendingDown className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">{h.searchQuery || h.filters.category || h.filters.propertyId || h.filters.dateFrom ? 'لا توجد نتائج للبحث' : 'لا توجد مصروفات مسجلة'}</p></div>
            ) : (
              <>
              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden px-3 py-2">
                {h.filteredExpenses.slice((h.currentPage - 1) * h.ITEMS_PER_PAGE, h.currentPage * h.ITEMS_PER_PAGE).map((item) => {
                  const attachCount = h.expenseInvoiceMap.get(item.id) || 0;
                  return (
                    <Card key={item.id} className="shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm">{item.expense_type}</span>
                              {attachCount > 0 && <Badge variant="secondary" className="gap-1 text-xs"><Paperclip className="w-3 h-3" />{attachCount}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.date}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => h.handleEdit(item)} disabled={h.isLocked} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => h.setDeleteTarget({ id: item.id, name: `مصروف ${item.expense_type}` })} disabled={h.isLocked} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div><p className="text-[11px] text-muted-foreground">المبلغ</p><p className="text-sm font-medium text-destructive">-{fmt(safeNumber(item.amount))} ر.س</p></div>
                          <div><p className="text-[11px] text-muted-foreground">العقار</p><p className="text-sm font-medium">{item.property?.property_number || '-'}</p></div>
                          {item.description && <div className="col-span-2"><p className="text-[11px] text-muted-foreground">الوصف</p><p className="text-sm text-muted-foreground">{item.description}</p></div>}
                        </div>
                        {h.expandedRow === item.id && <ExpenseAttachments expenseId={item.id} />}
                        {attachCount > 0 && (
                          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => h.setExpandedRow(h.expandedRow === item.id ? null : item.id)}>
                            {h.expandedRow === item.id ? 'إخفاء المرفقات' : 'عرض المرفقات'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {/* Desktop Table */}
               <div className="overflow-x-auto hidden md:block">
               <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right w-8"></TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => h.handleSort('expense_type')}>
                      <span className="inline-flex items-center gap-1">النوع <SortIcon field="expense_type" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => h.handleSort('amount')}>
                      <span className="inline-flex items-center gap-1">المبلغ <SortIcon field="amount" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => h.handleSort('date')}>
                      <span className="inline-flex items-center gap-1">التاريخ <SortIcon field="date" /></span>
                    </TableHead>
                    <TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">المرفقات</TableHead>
                    <TableHead className="text-right">الوصف</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {h.filteredExpenses.slice((h.currentPage - 1) * h.ITEMS_PER_PAGE, h.currentPage * h.ITEMS_PER_PAGE).map((item) => {
                    const attachCount = h.expenseInvoiceMap.get(item.id) || 0;
                    const isExpanded = h.expandedRow === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <TableRow className={isExpanded ? 'border-b-0' : ''}>
                          <TableCell className="p-1">
                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => h.setExpandedRow(isExpanded ? null : item.id)} aria-label={isExpanded ? 'طي' : 'توسيع'}>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{item.expense_type}</TableCell>
                          <TableCell className="text-destructive font-medium">-{fmt(safeNumber(item.amount))} ر.س</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.property?.property_number || '-'}</TableCell>
                          <TableCell>
                            {attachCount > 0 ? <Badge variant="secondary" className="gap-1"><Paperclip className="w-3 h-3" />{attachCount}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{item.description || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => h.handleEdit(item)} disabled={h.isLocked} aria-label="تعديل"><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => h.setDeleteTarget({ id: item.id, name: `مصروف ${item.expense_type}` })} disabled={h.isLocked} aria-label="حذف"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 p-3 border-b">
                              <ExpenseAttachments expenseId={item.id} />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
               </Table>
               </div>
              <TablePagination currentPage={h.currentPage} totalItems={h.filteredExpenses.length} itemsPerPage={h.ITEMS_PER_PAGE} onPageChange={h.setCurrentPage} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!h.deleteTarget} onOpenChange={(open) => !open && h.setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف "{h.deleteTarget?.name}"؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={h.handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ExpensesPage;
