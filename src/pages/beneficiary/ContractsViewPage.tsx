/**
 * صفحة عرض العقود للمستفيد (قراءة فقط)
 */
import { EXPIRING_SOON_DAYS } from '@/constants';
import { useContractsSafeByFiscalYear } from '@/hooks/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import DashboardLayout from '@/components/DashboardLayout';
import RequirePublishedYears from '@/components/RequirePublishedYears';
import ExportMenu from '@/components/ExportMenu';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, XCircle, DollarSign, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useMemo, useCallback } from 'react';
import { generateContractsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { fmt } from '@/utils/format';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'نشط', variant: 'default' },
  expired: { label: 'منتهي', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'secondary' },
};

const ContractsViewPage = () => {
  const { fiscalYearId } = useFiscalYear();
  const { data: contracts, isLoading, isError, refetch } = useContractsSafeByFiscalYear(fiscalYearId);
  
  const pdfWaqfInfo = usePdfWaqfInfo();

  const now = useMemo(() => new Date(), []);
  const in90Days = useMemo(() => new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000), [now]);

  const isExpiringSoon = useCallback(
    (c: { status: string | null; end_date: string | null }) =>
      c.status === 'active' && !!c.end_date && new Date(c.end_date) <= in90Days,
    [in90Days],
  );

  const stats = useMemo(() => {
    if (!contracts) return { total: 0, active: 0, expired: 0, totalRent: 0, expiringSoon: 0 };
    const active = contracts.filter(c => c.status === 'active');
    return {
      total: contracts.length,
      active: active.length,
      expired: contracts.filter(c => c.status === 'expired').length,
      totalRent: active.reduce((sum, c) => sum + (c.rent_amount || 0), 0),
      expiringSoon: active.filter(c => isExpiringSoon(c)).length,
    };
  }, [contracts, isExpiringSoon]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-SA');
  const formatCurrency = (n: number) => fmt(n) + ' ر.س';


  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 space-y-6">
          <PageHeaderCard title="العقود" icon={FileText} description="عرض عقود الإيجار" />
          <Card className="shadow-sm border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 flex flex-col items-center justify-center gap-3 min-h-[30vh]">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <h2 className="text-lg font-bold text-foreground">حدث خطأ أثناء تحميل العقود</h2>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                تعذر جلب بيانات العقود. يرجى التحقق من الاتصال والمحاولة مرة أخرى.
              </p>
              <Button onClick={() => refetch()} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" /> إعادة المحاولة
              </Button>
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
                  contract_number: c.contract_number ?? '',
                  tenant_name: c.tenant_name ?? '',
                  start_date: c.start_date ?? '',
                  end_date: c.end_date ?? '',
                  rent_amount: c.rent_amount ?? 0,
                  status: c.status ?? '',
                })),
                pdfWaqfInfo
              );
              toast.success('تم تصدير العقود بنجاح');
            } catch {
              toast.error('حدث خطأ أثناء تصدير PDF');
            }
          }} />
        } />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">إجمالي العقود</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">نشطة</p>
                <p className="text-xl font-bold">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">منتهية</p>
                <p className="text-xl font-bold">{stats.expired}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الإيجارات</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalRent)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">قريبة الانتهاء</p>
                <p className="text-xl font-bold">{stats.expiringSoon}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !contracts || contracts.length === 0 ? (
          <Card>
            <CardContent className="p-8 flex flex-col items-center justify-center gap-3">
              <FileText className="w-12 h-12 text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">لا توجد عقود مسجلة في هذه السنة المالية</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {contracts.map(contract => {
                const st = statusMap[contract.status ?? ''] || { label: contract.status ?? '', variant: 'outline' as const };
                return (
                  <Card key={contract.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-foreground">{contract.contract_number ?? ''}</p>
                          <p className="text-sm text-muted-foreground">{contract.tenant_name ?? ''}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={st.variant}>{st.label}</Badge>
                          {isExpiringSoon(contract) && (
                            <Badge variant="outline" className="text-warning border-warning text-[11px]">
                              <AlertTriangle className="w-3 h-3 ml-1" />ينتهي قريباً
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">الإيجار</span>
                        <span className="font-medium">{formatCurrency(contract.rent_amount ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">من</span>
                        <span>{formatDate(contract.start_date ?? '')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">إلى</span>
                        <span>{formatDate(contract.end_date ?? '')}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop table */}
            <Card className="hidden md:block">
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم العقد</TableHead>
                      <TableHead className="text-right">المستأجر</TableHead>
                      <TableHead className="text-right">العقار</TableHead>
                      <TableHead className="text-right">قيمة الإيجار</TableHead>
                      <TableHead className="text-right">تاريخ البداية</TableHead>
                      <TableHead className="text-right">تاريخ النهاية</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map(contract => {
                      const st = statusMap[contract.status ?? ''] || { label: contract.status ?? '', variant: 'outline' as const };
                      return (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.contract_number ?? ''}</TableCell>
                          <TableCell>{contract.tenant_name ?? ''}</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>{formatCurrency(contract.rent_amount ?? 0)}</TableCell>
                          <TableCell>{formatDate(contract.start_date ?? '')}</TableCell>
                          <TableCell>{formatDate(contract.end_date ?? '')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge variant={st.variant}>{st.label}</Badge>
                              {isExpiringSoon(contract) && (
                                <Badge variant="outline" className="text-warning border-warning text-[11px]">
                                  <AlertTriangle className="w-3 h-3 ml-1" />قريب
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default ContractsViewPage;
