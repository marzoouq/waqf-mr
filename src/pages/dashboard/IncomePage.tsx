import { fmt } from '@/utils/format/format';
import { lazy, Suspense } from 'react';

import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TrendingUp, Search, AlertTriangle } from 'lucide-react';
import { IncomeSummaryCards, IncomeMobileCards, IncomeDesktopTable, IncomeFormDialog } from '@/components/income';
import { TablePagination, ExportMenu, TableSkeleton, LockedYearBanner, ConfirmDeleteDialog } from '@/components/common';
import AdvancedFiltersBar from '@/components/dashboard/AdvancedFiltersBar';
import { Skeleton } from '@/components/ui/skeleton';
import { useIncomePage } from '@/hooks/page/admin/financial/useIncomePage';

const IncomeMonthlyChart = lazy(() => import('@/components/dashboard/charts/IncomeMonthlyChart'));

const IncomePage = () => {
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
    paginatedItems,
    handleExportPdf, handleExportCsv,
  } = useIncomePage();

  return (
    <DashboardLayout>
       <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة الدخل"
          icon={TrendingUp}
          description="تسجيل ومتابعة مصادر الدخل"
          actions={<>
            <ExportMenu onExportPdf={handleExportPdf} onExportCsv={handleExportCsv} />
            <IncomeFormDialog
              open={isOpen} onOpenChange={setIsOpen}
              editingIncome={editingIncome}
              formData={formData} setFormData={setFormData}
              onSubmit={handleSubmit} onReset={resetForm}
              isPending={createPending || updatePending}
              isLocked={isLocked} properties={properties}
            />
          </>}
        />

        <LockedYearBanner isClosed={isClosed} role={role} />


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

        <ConfirmDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          targetName={deleteTarget?.name}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </DashboardLayout>
  );
};

export default IncomePage;
