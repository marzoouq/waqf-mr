import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, TrendingUp, TrendingDown, Wallet, AlertCircle, RefreshCw, FileDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import ExportMenu from '@/components/ExportMenu';
import DashboardLayout from '@/components/DashboardLayout';
import { generateDisclosurePDF, generateComprehensiveBeneficiaryPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { safeNumber } from '@/utils/safeNumber';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';
import { useContractsSafeByFiscalYear } from '@/hooks/useContracts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTotalBeneficiaryPercentage } from '@/hooks/useTotalBeneficiaryPercentage';
import PageHeaderCard from '@/components/PageHeaderCard';

/** تنسيق تاريخ ميلادي بصيغة يوم/شهر/سنة */
function toGregorianShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

const DisclosurePage = () => {
  const queryClient = useQueryClient();
  const handleRetry = () => queryClient.invalidateQueries();
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { fiscalYearId, fiscalYear: selectedFY, noPublishedYears } = useFiscalYear();

  const {
    beneficiaries,
    totalIncome,
    totalExpenses,
    currentAccount,
    isAccountMissing,
    vatAmount,
    zakatAmount,
    waqfCorpusManual,
    waqfCorpusPrevious,
    grandTotal,
    netAfterExpenses,
    netAfterVat,
    netAfterZakat,
    adminShare,
    waqifShare,
    adminPct,
    waqifPct,
    waqfRevenue,
    incomeBySource,
    expensesByTypeExcludingVat,
    availableAmount,
    isLoading: finLoading,
    isError: finError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  const { data: contracts = [], isLoading: contractsLoading } = useContractsSafeByFiscalYear(fiscalYearId);

  const { data: totalBenPct = 0 } = useTotalBeneficiaryPercentage();
  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);
  const beneficiariesShare = availableAmount;
  const myShare = currentBeneficiary && totalBenPct > 0
    ? beneficiariesShare * (currentBeneficiary.share_percentage ?? 0) / totalBenPct
    : 0;

  const fiscalYear = currentAccount?.fiscal_year || selectedFY?.label || '';

  // Build Gregorian fiscal year label from start/end dates
  const gregorianFiscalYear = selectedFY
    ? `${toGregorianShort(selectedFY.start_date)}م — ${toGregorianShort(selectedFY.end_date)}م`
    : fiscalYear;

  // Distributions for comprehensive report
  const { data: distributions = [] } = useQuery({
    queryKey: ['my-distributions', currentBeneficiary?.id, fiscalYearId],
    queryFn: async () => {
      if (!currentBeneficiary?.id) return [];
      const { data, error } = await supabase
        .from('distributions')
        .select('*, account:accounts(*)')
        .eq('beneficiary_id', currentBeneficiary.id)
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!currentBeneficiary?.id,
  });

  // F6: فلترة التوزيعات بالسنة المالية عند عدم وجود حساب ختامي
  const filteredDistributions = currentAccount
    ? distributions.filter(d => d.account_id === currentAccount.id)
    : (fiscalYearId && fiscalYearId !== 'all'
        ? distributions.filter(d => 'fiscal_year_id' in d && d.fiscal_year_id === fiscalYearId)
        : distributions);

  const totalReceived = filteredDistributions
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + safeNumber(d.amount), 0);

  const pendingAmount = filteredDistributions
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + safeNumber(d.amount), 0);

  const handleDownloadPDF = async () => {
    try {
      await generateDisclosurePDF({
        fiscalYear: gregorianFiscalYear,
        beneficiaryName: currentBeneficiary?.name || '',
        sharePercentage: currentBeneficiary?.share_percentage || 0,
        myShare,
        totalIncome,
        totalExpenses,
        netRevenue: netAfterZakat,
        adminShare,
        waqifShare,
        adminPct,
        waqifPct,
        beneficiariesShare,
        incomeBySource,
        expensesByType: expensesByTypeExcludingVat,
      }, pdfWaqfInfo);
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  };

  const handleDownloadComprehensivePDF = async () => {
    try {
      await generateComprehensiveBeneficiaryPDF({
        beneficiaryName: currentBeneficiary?.name || '',
        fiscalYear: gregorianFiscalYear,
        totalIncome,
        totalExpenses,
        netAfterExpenses,
        vatAmount,
        netAfterVat,
        zakatAmount,
        netAfterZakat,
        adminShare,
        waqifShare,
        adminPct,
        waqifPct,
        waqfRevenue,
        waqfCorpusManual,
        availableAmount: beneficiariesShare,
        myShare,
        totalReceived,
        pendingAmount,
        incomeBySource,
        expensesByType: expensesByTypeExcludingVat,
        contracts: contracts.map(c => ({
          contract_number: c.contract_number ?? '',
          tenant_name: c.tenant_name ?? '',
          rent_amount: safeNumber(c.rent_amount),
          status: c.status ?? '',
        })),
        distributions: filteredDistributions.map(d => ({
          date: d.date,
          fiscalYear: d.account?.fiscal_year || '-',
          amount: safeNumber(d.amount),
          status: d.status,
        })),
      }, pdfWaqfInfo);
      toast.success('تم تحميل التقرير الشامل بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير التقرير الشامل');
    }
  };

  if (finLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5">
          <PageHeaderCard title="الإفصاح السنوي" icon={FileText} />
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  if (finError) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5">
          <PageHeaderCard title="الإفصاح السنوي" icon={FileText} />
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  // H-1: guard — مستفيد بدون user_id مربوط
  if (!currentBeneficiary && !benLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-warning" />
          <h2 className="text-xl font-bold text-foreground">حسابك غير مرتبط</h2>
          <p className="text-muted-foreground text-center max-w-md">
            حسابك لم يُربط بسجل مستفيد بعد. يرجى التواصل مع ناظر الوقف.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (isAccountMissing) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-warning" />
          <h2 className="text-xl font-bold">لم يتم العثور على الحساب الختامي</h2>
          <p className="text-muted-foreground text-center max-w-md">
            لا يوجد حساب ختامي مسجل لهذه السنة المالية بعد. يرجى التواصل مع ناظر الوقف أو المحاولة لاحقاً.
          </p>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة تحميل
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="الإفصاح السنوي"
          description={`السنة المالية: ${gregorianFiscalYear}`}
          icon={FileText}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadComprehensivePDF}>
                <FileDown className="w-4 h-4" />
                تقرير شامل
              </Button>
              <ExportMenu onExportPdf={handleDownloadPDF} />
            </div>
          }
        />

        {/* Summary Cards */}
        <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${waqfCorpusPrevious > 0 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <Card className="shadow-sm bg-success/10 border-success/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الإيرادات</p>
                  <p className="text-lg sm:text-2xl font-bold text-success truncate">+{totalIncome.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {waqfCorpusPrevious > 0 && (
            <Card className="shadow-sm bg-info/10 border-info/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-info/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">مبلغ مرحّل من العام السابق</p>
                    <p className="text-lg sm:text-2xl font-bold text-info truncate">+{waqfCorpusPrevious.toLocaleString()} ر.س</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm bg-destructive/10 border-destructive/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-destructive/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي المصروفات</p>
                  <p className="text-lg sm:text-2xl font-bold text-destructive truncate">-{totalExpenses.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm gradient-primary text-primary-foreground">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-foreground/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-primary-foreground/90">حصتي المستحقة</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">{myShare.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              العقود
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contractsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : contracts.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">لا توجد عقود مسجلة</p>
            ) : isMobile ? (
              /* Mobile: Card-based grid */
              <div className="grid grid-cols-1 gap-3">
                {contracts.map(c => (
                  <div key={c.id} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{c.contract_number}</span>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                        {c.status === 'active' ? 'نشط' : c.status === 'expired' ? 'منتهي' : c.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.tenant_name}</p>
                    <div className="flex justify-between text-xs">
                      <span>سنوي: {safeNumber(c.rent_amount).toLocaleString()} ر.س</span>
                      <span>شهري: {Math.round(safeNumber(c.rent_amount) / 12).toLocaleString()} ر.س</span>
                    </div>
                  </div>
                ))}
                <div className="p-3 rounded-lg bg-primary/10 font-bold text-sm flex justify-between">
                  <span>الإجمالي</span>
                  <span>{contracts.filter(c => c.status === 'active').reduce((s, c) => s + safeNumber(c.rent_amount), 0).toLocaleString()} ر.س</span>
                </div>
              </div>
            ) : (
              /* Desktop: Table */
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">رقم العقد</TableHead>
                      <TableHead className="text-right">المستأجر</TableHead>
                      <TableHead className="text-right">الإيجار السنوي</TableHead>
                      <TableHead className="text-right">الإيجار الشهري</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.contract_number}</TableCell>
                        <TableCell>{c.tenant_name}</TableCell>
                        <TableCell>{Number(c.rent_amount).toLocaleString()} ر.س</TableCell>
                        <TableCell>{Math.round(Number(c.rent_amount) / 12).toLocaleString()} ر.س</TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                            {c.status === 'active' ? 'نشط' : c.status === 'expired' ? 'منتهي' : c.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell colSpan={2}>الإجمالي</TableCell>
                      <TableCell>{contracts.filter(c => c.status === 'active').reduce((s, c) => s + Number(c.rent_amount), 0).toLocaleString()} ر.س</TableCell>
                      <TableCell>{Math.round(contracts.filter(c => c.status === 'active').reduce((s, c) => s + Number(c.rent_amount), 0) / 12).toLocaleString()} ر.س</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Financial Statement */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              البيان المالي التفصيلي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Income Breakdown */}
              <div>
                <h3 className="font-bold text-lg mb-3 text-success">الإيرادات</h3>
                <div className="space-y-2">
                  {Object.entries(incomeBySource).map(([source, amount]) => (
                    <div key={source} className="flex justify-between items-center py-2 border-b border-dashed">
                      <span>{source}</span>
                      <span className="text-success font-medium">+{amount.toLocaleString()} ر.س</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2 font-bold bg-success/10 rounded px-2">
                    <span>إجمالي الإيرادات</span>
                    <span className="text-success">+{totalIncome.toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>

              {/* Expenses Breakdown */}
              <div>
                <h3 className="font-bold text-lg mb-3 text-destructive">المصروفات</h3>
                <div className="space-y-2">
                  {Object.entries(expensesByTypeExcludingVat).map(([type, amount]) => (
                    <div key={type} className="flex justify-between items-center py-2 border-b border-dashed">
                      <span>{type}</span>
                      <span className="text-destructive font-medium">-{amount.toLocaleString()} ر.س</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2 font-bold bg-destructive/10 rounded px-2">
                    <span>إجمالي المصروفات</span>
                    <span className="text-destructive">-{totalExpenses.toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>

              {/* Full Financial Sequence */}
              <div className="border-t-2 pt-4 space-y-2 sm:space-y-3">
                {waqfCorpusPrevious > 0 && (
                  <>
                    <div className="flex justify-between items-center py-2 text-info text-sm sm:text-base">
                      <span>(+) رقبة الوقف المرحّلة من العام السابق</span>
                      <span className="whitespace-nowrap mr-2">+{waqfCorpusPrevious.toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-bold text-sm sm:text-base">الإجمالي الشامل</span>
                      <span className="font-bold text-base sm:text-lg whitespace-nowrap mr-2">{grandTotal.toLocaleString()} ر.س</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold text-sm sm:text-base">الصافي بعد المصاريف</span>
                  <span className="font-bold text-base sm:text-lg whitespace-nowrap mr-2">{netAfterExpenses.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 text-destructive text-sm sm:text-base">
                  <span>(-) ضريبة القيمة المضافة</span>
                  <span className="whitespace-nowrap mr-2">-{vatAmount.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold text-sm sm:text-base">الصافي بعد خصم الضريبة</span>
                  <span className="font-bold text-primary text-base sm:text-lg whitespace-nowrap mr-2">{netAfterVat.toLocaleString()} ر.س</span>
                </div>
                {zakatAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center py-2 text-destructive text-sm sm:text-base">
                      <span>(-) الزكاة</span>
                      <span className="whitespace-nowrap mr-2">-{zakatAmount.toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-bold text-sm sm:text-base">الصافي بعد الزكاة</span>
                      <span className="font-bold whitespace-nowrap mr-2">{netAfterZakat.toLocaleString()} ر.س</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center py-2 text-muted-foreground text-xs sm:text-sm">
                  <span>(-) حصة الناظر ({adminPct}%)</span>
                  <span className="whitespace-nowrap mr-2">-{adminShare.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-2 text-muted-foreground text-xs sm:text-sm">
                  <span>(-) حصة الواقف ({waqifPct}%)</span>
                  <span className="whitespace-nowrap mr-2">-{waqifShare.toLocaleString()} ر.س</span>
                </div>
                {waqfCorpusManual > 0 && (
                  <div className="flex justify-between items-center py-2 text-muted-foreground text-xs sm:text-sm">
                    <span>(-) احتياطي رقبة الوقف</span>
                    <span className="whitespace-nowrap mr-2">-{waqfCorpusManual.toLocaleString()} ر.س</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 font-bold text-sm sm:text-base">
                  <span>الإجمالي القابل للتوزيع</span>
                  <span className="whitespace-nowrap mr-2">{beneficiariesShare.toLocaleString()} ر.س</span>
                </div>
              </div>

              {/* My Share */}
              <div className="bg-primary/10 rounded-xl p-4 sm:p-6 mt-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">حصتي المستحقة ({currentBeneficiary?.share_percentage ?? 0}%)</p>
                    <p className="font-bold text-xl sm:text-2xl text-primary">{myShare.toLocaleString()} ر.س</p>
                  </div>
                  <div className="sm:text-end">
                    <p className="text-xs sm:text-sm text-muted-foreground">الاسم</p>
                    <p className="font-bold text-sm sm:text-base">{currentBeneficiary?.name || 'غير مرتبط'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DisclosurePage;
