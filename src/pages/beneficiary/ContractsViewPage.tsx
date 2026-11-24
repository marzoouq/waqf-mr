/**
 * صفحة عرض العقود للمستفيد (قراءة فقط)
 */
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { DashboardLayout, PageHero } from '@/components/layout';
import { RequirePublishedYears, ExportMenu, TablePagination, ViewModeToggle, useViewMode, ErrorState } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/skeleton';
import ContractsViewMobileCards from '@/components/contracts/ContractsViewMobileCards';
import ContractsViewDesktopTable from '@/components/contracts/ContractsViewDesktopTable';
import ContractsViewGridCards from '@/components/contracts/ContractsViewGridCards';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractsViewPage } from '@/hooks/page/beneficiary';
import { CONTRACTS_SCOPE_COPY } from '@/constants/beneficiaryCopy';

const ContractsViewPage = () => {
  const { noPublishedYears } = useFiscalYear();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useViewMode('beneficiary-contracts', 'table');
  const {
    contracts, isLoading, isError, refetch,
    currentPage, setCurrentPage,
    propertiesMap, isExpiringSoon, stats,
    paginatedContracts, handleExportPdf,
    totalItems, itemsPerPage, statusFilter, setStatusFilter,
  } = useContractsViewPage();
  const filters = [
    { key: 'all', label: 'الكل', count: stats.total },
    { key: 'active', label: 'نشطة', count: stats.active },
    { key: 'expired', label: 'منتهية', count: stats.expired },
  ] as const;

  // B2: حارس السنوات المنشورة قبل أي فرع
  if (noPublishedYears) {
    return <RequirePublishedYears title={CONTRACTS_SCOPE_COPY.title} icon={FileText} description={CONTRACTS_SCOPE_COPY.description}><></></RequirePublishedYears>;
  }

  // B14: ErrorState الموحّد
  if (isError) {
    return (
      <ErrorState
        message="حدث خطأ أثناء تحميل العقود"
        description="تعذر جلب بيانات العقود. يرجى التحقق من الاتصال والمحاولة مرة أخرى."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <RequirePublishedYears title={CONTRACTS_SCOPE_COPY.title} icon={FileText} description={CONTRACTS_SCOPE_COPY.description}>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-5">
          <PageHero
            title={CONTRACTS_SCOPE_COPY.title}
            icon={FileText}
            description={CONTRACTS_SCOPE_COPY.context}
            actions={
              <>
                {!isMobile && <ViewModeToggle value={viewMode} onChange={setViewMode} />}
                <ExportMenu onExportPdf={handleExportPdf} />
              </>
            }
            facts={[
              { label: 'إجمالي العقود', value: stats.total },
              { label: 'عقود نشطة', value: stats.active, hint: `${stats.activePercent}% من العقود` },
              { label: 'عقود منتهية', value: stats.expired },
              { label: 'القيمة السنوية للعقود', value: <>{fmt(stats.totalRent)} <span className="text-xs font-normal">ر.س</span></> },
            ]}
          />

          <div role="tablist" aria-label="تصفية العقود بالحالة" className="flex gap-2 overflow-x-auto pb-1">
            {filters.map(f => (
              <button
                key={f.key}
                role="tab"
                type="button"
                aria-selected={statusFilter === f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  statusFilter === f.key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {f.label}
                <span className={cn('num rounded-full px-1.5 text-xs', statusFilter === f.key ? 'bg-primary-foreground/20' : 'bg-muted')}>{f.count}</span>
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !contracts || contracts.length === 0 ? (
            <Card>
              <CardContent className="p-8 flex flex-col items-center justify-center gap-3">
                <FileText className="w-12 h-12 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium">لا توجد عقود مسجلة في هذه السنة المالية</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {isMobile ? (
                <>
                  <ContractsViewMobileCards contracts={paginatedContracts} propertiesMap={propertiesMap} isExpiringSoon={isExpiringSoon} />
                  <TablePagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
                </>
              ) : viewMode === 'grid' ? (
                <>
                  <ContractsViewGridCards contracts={paginatedContracts} propertiesMap={propertiesMap} isExpiringSoon={isExpiringSoon} />
                  <TablePagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
                </>
              ) : (
                <>
                  <ContractsViewDesktopTable contracts={paginatedContracts} propertiesMap={propertiesMap} isExpiringSoon={isExpiringSoon} />
                  <TablePagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
                </>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default ContractsViewPage;
