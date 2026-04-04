/**
 * صفحة عرض العقود للمستفيد (قراءة فقط)
 */
import { useIsMobile } from '@/hooks/ui/use-mobile';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { RequirePublishedYears, ExportMenu, TablePagination } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ContractStatsCards } from '@/components/contracts';
import ContractsViewMobileCards from '@/components/contracts/ContractsViewMobileCards';
import ContractsViewDesktopTable from '@/components/contracts/ContractsViewDesktopTable';
import { useContractsViewPage } from '@/hooks/page/beneficiary/useContractsViewPage';

const ContractsViewPage = () => {
  const isMobile = useIsMobile();
  const {
    contracts, isLoading, isError, refetch,
    currentPage, setCurrentPage,
    propertiesMap, isExpiringSoon, stats,
    paginatedContracts, handleExportPdf,
    totalItems, itemsPerPage,
  } = useContractsViewPage();

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 space-y-6">
          <PageHeaderCard title="العقود" icon={FileText} description="عرض عقود الإيجار" />
          <Card className="shadow-sm border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 flex flex-col items-center justify-center gap-3 min-h-[30vh]">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <h2 className="text-lg font-bold text-foreground">حدث خطأ أثناء تحميل العقود</h2>
              <p className="text-sm text-muted-foreground text-center max-w-md">تعذر جلب بيانات العقود. يرجى التحقق من الاتصال والمحاولة مرة أخرى.</p>
              <Button onClick={() => refetch()} variant="outline" className="gap-2"><RefreshCw className="w-4 h-4" /> إعادة المحاولة</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RequirePublishedYears title="العقود" icon={FileText} description="عرض عقود الإيجار">
      <DashboardLayout>
        <div className="p-4 md:p-6 space-y-6">
          <PageHeaderCard title="العقود" icon={FileText} description="عرض عقود الإيجار" actions={
            <ExportMenu onExportPdf={handleExportPdf} />
          } />

          <ContractStatsCards stats={stats} isLoading={!!isLoading} />

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
