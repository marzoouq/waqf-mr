/**
 * صفحة إفصاح مصروفات الوقف — لوحة المستفيد/الواقف.
 * ملخّص إفصاحي (بطاقات + مخطط) + سجل تفصيلي read-only لكل مصروف
 * مع أزرار فواتيره المرفقة (ZATCA) القابلة للفتح داخل InvoiceViewer.
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportMenu, RequirePublishedYears, TablePagination, TableSkeleton } from '@/components/common';
import { TrendingDown, Info, FileText } from 'lucide-react';
import {
  ExpenseSummaryCards,
  ExpensesPieChart,
  ExpensesDesktopTable,
  ExpensesMobileCards,
} from '@/components/expenses';
import { useExpensesViewPage } from '@/hooks/page/beneficiary';
import { EXPENSES_SCOPE_COPY } from '@/constants/beneficiaryCopy';
import type { SortField } from '@/hooks/page/admin/financial/useExpensesPage';

const noop = () => {};
const noopSort: (_field: SortField) => void = () => {};

const ExpensesViewPage = () => {
  const h = useExpensesViewPage();

  return (
    <RequirePublishedYears
      title={EXPENSES_SCOPE_COPY.title}
      icon={TrendingDown}
      description={EXPENSES_SCOPE_COPY.description}
    >
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <PageHeaderCard
            title={EXPENSES_SCOPE_COPY.title}
            icon={TrendingDown}
            description={EXPENSES_SCOPE_COPY.description}
            actions={<ExportMenu onExportPdf={h.handleExportPdf} onExportCsv={h.handleExportCsv} />}
          />

          <div
            className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground"
            role="status"
          >
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <p>{EXPENSES_SCOPE_COPY.context}</p>
          </div>

          <ExpenseSummaryCards
            expenses={h.expenses}
            totalExpenses={h.totalExpenses}
            documentedCount={h.documentedCount}
            documentationRate={h.documentationRate}
            isLoading={h.isLoading}
          />
          <ExpensesPieChart expenses={h.expenses} isLoading={h.isLoading} />

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-primary" />
                سجل المصروفات ومستنداتها
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {h.isLoading ? (
                <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
              ) : h.expenses.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  لا توجد مصروفات مسجّلة في هذه السنة.
                </p>
              ) : (
                <>
                  <ExpensesMobileCards
                    items={h.paginatedExpenses}
                    expenseInvoiceMap={h.expenseInvoiceMap}
                    expandedRow={h.expandedRow}
                    setExpandedRow={h.setExpandedRow}
                    onEdit={noop}
                    onDelete={noop}
                    isLocked
                    readOnly
                  />
                  <ExpensesDesktopTable
                    items={h.paginatedExpenses}
                    expenseInvoiceMap={h.expenseInvoiceMap}
                    expandedRow={h.expandedRow}
                    setExpandedRow={h.setExpandedRow}
                    onEdit={noop}
                    onDelete={noop}
                    isLocked
                    sortField={'date' as SortField}
                    sortDir="desc"
                    onSort={noopSort}
                    readOnly
                  />
                  <TablePagination
                    currentPage={h.currentPage}
                    totalItems={h.expenses.length}
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
