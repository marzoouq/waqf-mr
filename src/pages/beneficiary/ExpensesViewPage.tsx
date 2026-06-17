/**
 * صفحة المصروفات — لوحة المستفيد/الواقف.
 * عرض للاطلاع فقط يطابق `/dashboard/expenses` في البيانات والفلاتر والتصدير.
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TableSkeleton, TablePagination, ExportMenu, RequirePublishedYears, ViewModeToggle, useViewMode } from '@/components/common';
import { TrendingDown, Search, Info } from 'lucide-react';
import {
  ExpenseSummaryCards,
  ExpensesPieChart,
  ExpensesMobileCards,
  ExpensesDesktopTable,
} from '@/components/expenses';
import AdvancedFiltersBar from '@/components/dashboard/AdvancedFiltersBar';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { useExpensesViewPage } from '@/hooks/page/beneficiary';

const noop = () => undefined;

const ExpensesViewPage = () => {
  const h = useExpensesViewPage();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useViewMode('beneficiary-expenses', 'table');

  return (
    <RequirePublishedYears
      title="مصروفات الوقف"
      icon={TrendingDown}
      description="جميع مصروفات الوقف — للاطلاع فقط"
    >
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <PageHeaderCard
            title="مصروفات الوقف"
            icon={TrendingDown}
            description="جميع مصروفات الوقف — للاطلاع فقط"
            actions={<div className="flex items-center gap-2">
              {!isMobile && <ViewModeToggle value={viewMode} onChange={setViewMode} />}
              <ExportMenu onExportPdf={h.handleExportPdf} onExportCsv={h.handleExportCsv} />
            </div>}
          />

          <div
            className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground"
            role="status"
          >
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <p>عرض للاطلاع فقط — لا يمكن إضافة أو تعديل أو حذف المصروفات من هذه الشاشة.</p>
          </div>

          <ExpenseSummaryCards
            expenses={h.expenses}
            totalExpenses={h.totalExpenses}
            documentedCount={h.documentedCount}
            documentationRate={h.documentationRate}
            isLoading={h.isLoading}
          />
          <ExpensesPieChart expenses={h.expenses} isLoading={h.isLoading} />

          <div className="space-y-3">
            <div className="relative max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="expenses-view-search"
                name="expenses-view-search"
                aria-label="بحث"
                placeholder="بحث في المصروفات..."
                value={h.searchQuery}
                onChange={(e) => { h.setSearchQuery(e.target.value); h.setCurrentPage(1); }}
                className="ps-10"
              />
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
                <div className="py-12 text-center">
                  <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {h.searchQuery || h.filters.category || h.filters.propertyId || h.filters.dateFrom
                      ? 'لا توجد نتائج للبحث'
                      : 'لا توجد مصروفات مسجلة'}
                  </p>
                </div>
              ) : (
                <>
                  <ExpensesMobileCards
                    items={h.paginatedExpenses}
                    expenseInvoiceMap={h.expenseInvoiceMap}
                    expandedRow={h.expandedRow}
                    setExpandedRow={h.setExpandedRow}
                    onEdit={noop}
                    onDelete={noop}
                    isLocked={h.isLocked}
                    readOnly
                    viewMode={!isMobile && viewMode === 'grid' ? 'grid' : 'auto'}
                  />
                  {!(viewMode === 'grid' && !isMobile) && (
                    <ExpensesDesktopTable
                      items={h.paginatedExpenses}
                      expenseInvoiceMap={h.expenseInvoiceMap}
                      expandedRow={h.expandedRow}
                      setExpandedRow={h.setExpandedRow}
                      onEdit={noop}
                      onDelete={noop}
                      isLocked={h.isLocked}
                      readOnly
                      sortField={h.sortField}
                      sortDir={h.sortDir}
                      onSort={h.handleSort}
                    />
                  )}
                  <TablePagination
                    currentPage={h.currentPage}
                    totalItems={h.filteredExpenses.length}
                    itemsPerPage={h.ITEMS_PER_PAGE}
                    onPageChange={h.setCurrentPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default ExpensesViewPage;
