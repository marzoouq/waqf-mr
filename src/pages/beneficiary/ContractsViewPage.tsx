/**
 * صفحة عرض العقود للمستفيد (قراءة فقط)
 */
import { EXPIRING_SOON_DAYS } from '@/constants';
import { useContractsSafeByFiscalYear } from '@/hooks/data/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { RequirePublishedYears, ExportMenu, TablePagination } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { generateContractsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { toast } from 'sonner';
import { usePropertiesMap } from '@/hooks/data/usePropertiesMap';
import { ContractStatsCards } from '@/components/contracts';
import ContractsViewMobileCards from '@/components/contracts/ContractsViewMobileCards';
import ContractsViewDesktopTable from '@/components/contracts/ContractsViewDesktopTable';

const ITEMS_PER_PAGE = 10;

const ContractsViewPage = () => {
  const { fiscalYearId } = useFiscalYear();
  const { data: contracts, isLoading, isError, refetch } = useContractsSafeByFiscalYear(fiscalYearId);
  const [currentPage, setCurrentPage] = useState(1);

  const propertyIds = useMemo(() => {
    if (!contracts) return [];
    return [...new Set(contracts.map(c => c.property_id).filter(Boolean))] as string[];
  }, [contracts]);

  const { data: propertiesMap = {} } = usePropertiesMap(propertyIds);

  const pdfWaqfInfo = usePdfWaqfInfo();
  const now = useMemo(() => new Date(), []);
  const in90Days = useMemo(() => new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000), [now]);

  const isExpiringSoon = useCallback(
    (c: { status: string | null; end_date: string | null }) =>
      c.status === 'active' && !!c.end_date && new Date(c.end_date) <= in90Days,
    [in90Days],
  );

  const stats = useMemo(() => {
    if (!contracts) return { total: 0, active: 0, expired: 0, totalRent: 0, expiringSoon: 0, activePercent: 0, activeRent: 0 };
    const active = contracts.filter(c => c.status === 'active');
    const totalRent = contracts.reduce((sum, c) => sum + (c.rent_amount || 0), 0);
    const activeRent = active.reduce((sum, c) => sum + (c.rent_amount || 0), 0);
    const activePercent = contracts.length > 0 ? Math.round((active.length / contracts.length) * 100) : 0;
    return {
      total: contracts.length, active: active.length, activePercent, activeRent,
      expired: contracts.filter(c => c.status === 'expired').length,
      totalRent, expiringSoon: active.filter(c => isExpiringSoon(c)).length,
    };
  }, [contracts, isExpiringSoon]);

  const paginatedContracts = useMemo(() => {
    if (!contracts) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return contracts.slice(start, start + ITEMS_PER_PAGE);
  }, [contracts, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [fiscalYearId]);

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
            <ExportMenu onExportPdf={async () => {
              try {
                await generateContractsPDF(
                  (contracts ?? []).map(c => ({
                    contract_number: c.contract_number ?? '', tenant_name: c.tenant_name ?? '',
                    start_date: c.start_date ?? '', end_date: c.end_date ?? '',
                    rent_amount: c.rent_amount ?? 0, status: c.status ?? '',
                  })),
                  pdfWaqfInfo
                );
                toast.success('تم تصدير العقود بنجاح');
              } catch { toast.error('حدث خطأ أثناء تصدير PDF'); }
            }} />
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
              <ContractsViewMobileCards contracts={paginatedContracts} isExpiringSoon={isExpiringSoon} />
              <div className="md:hidden">
                <TablePagination currentPage={currentPage} totalItems={contracts?.length ?? 0} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
              </div>
              <ContractsViewDesktopTable contracts={paginatedContracts} propertiesMap={propertiesMap} isExpiringSoon={isExpiringSoon} />
              <TablePagination currentPage={currentPage} totalItems={contracts?.length ?? 0} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
            </>
          )}
        </div>
      </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default ContractsViewPage;
