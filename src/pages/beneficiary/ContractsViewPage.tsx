/**
 * صفحة عرض العقود للمستفيد (قراءة فقط)
 */
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { RequirePublishedYears, ExportMenu, TablePagination, ViewModeToggle, useViewMode, ErrorState } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ContractStatsCards } from '@/components/contracts';
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
    totalItems, itemsPerPage,
  } = useContractsViewPage();

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
        <div className="p-4 md:p-6 space-y-6">
          <PageHeaderCard title={CONTRACTS_SCOPE_COPY.title} icon={FileText} description={CONTRACTS_SCOPE_COPY.description} actions={
            <div className="flex items-center gap-2">
              {!isMobile && <ViewModeToggle value={viewMode} onChange={setViewMode} />}
              <ExportMenu onExportPdf={handleExportPdf} />
            </div>
          } />

          <Card className="shadow-sm border-info/30 bg-info/5">
            <CardContent className="p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{CONTRACTS_SCOPE_COPY.context}</p>
            </CardContent>
          </Card>

          <ContractStatsCards stats={stats} isLoading={!!isLoading} variant="beneficiary" />

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
                  <ContractsViewMobileCards contracts={paginatedContracts} isExpiringSoon={isExpiringSoon} />
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
