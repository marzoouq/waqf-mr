import { safeNumber } from '@/utils/format/safeNumber';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TableSkeleton, TablePagination, ExportMenu, LockedYearBanner, ConfirmDeleteDialog } from '@/components/common';
import { TrendingDown, Search } from 'lucide-react';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { ExpenseSummaryCards, ExpenseFormDialog, ExpensesPieChart, ExpenseBudgetBar, ExpensesMobileCards, ExpensesDesktopTable } from '@/components/expenses';
import AdvancedFiltersBar from '@/components/filters/AdvancedFiltersBar';
import { defaultNotify } from '@/lib/notify';
import { useExpensesPage } from '@/hooks/page/admin/financial/useExpensesPage';

const ExpensesPage = () => {
  const h = useExpensesPage();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة المصروفات"
          icon={TrendingDown}
          description="تسجيل ومتابعة المصروفات"
          actions={<>
            <ExportMenu onExportPdf={async () => { const { generateExpensesPDF } = await import('@/utils/pdf'); return generateExpensesPDF(h.filteredExpenses, h.totalExpenses, h.pdfWaqfInfo); }} onExportCsv={() => {
              const csv = buildCsv(h.filteredExpenses.map(item => ({
                'النوع': item.expense_type, 'المبلغ': safeNumber(item.amount), 'التاريخ': item.date,
                'العقار': item.property?.property_number || '-', 'الوصف': item.description || '-',
              })));
              downloadCsv(csv, 'مصروفات.csv');
              defaultNotify.success('تم تصدير المصروفات بنجاح');
            }} />
            <ExpenseFormDialog
              isOpen={h.isOpen} setIsOpen={h.setIsOpen} formData={h.formData} setFormData={h.setFormData}
              isEditing={!!h.editingExpense} isPending={h.createExpense.isPending || h.updateExpense.isPending}
              properties={h.properties} onSubmit={h.handleSubmit} onReset={h.resetForm} disabled={h.isLocked}
            />
          </>}
        />

        <LockedYearBanner isClosed={h.isClosed} role={h.role} />


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
                <ExpensesMobileCards
                  items={h.paginatedExpenses}
                  expenseInvoiceMap={h.expenseInvoiceMap}
                  expandedRow={h.expandedRow}
                  setExpandedRow={h.setExpandedRow}
                  onEdit={h.handleEdit}
                  onDelete={h.setDeleteTarget}
                  isLocked={h.isLocked}
                />
                <ExpensesDesktopTable
                  items={h.paginatedExpenses}
                  expenseInvoiceMap={h.expenseInvoiceMap}
                  expandedRow={h.expandedRow}
                  setExpandedRow={h.setExpandedRow}
                  onEdit={h.handleEdit}
                  onDelete={h.setDeleteTarget}
                  isLocked={h.isLocked}
                  sortField={h.sortField}
                  sortDir={h.sortDir}
                  onSort={h.handleSort}
                />
                <TablePagination currentPage={h.currentPage} totalItems={h.filteredExpenses.length} itemsPerPage={h.ITEMS_PER_PAGE} onPageChange={h.setCurrentPage} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={!!h.deleteTarget}
        onOpenChange={(open) => !open && h.setDeleteTarget(null)}
        targetName={h.deleteTarget?.name}
        onConfirm={h.handleConfirmDelete}
      />
    </DashboardLayout>
  );
};

export default ExpensesPage;
