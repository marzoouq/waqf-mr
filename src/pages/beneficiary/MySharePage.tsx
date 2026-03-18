import { useState } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, Clock, CheckCircle, AlertCircle, FileText, RefreshCw, UserX, Banknote, FileDown, Printer, XCircle, Info, Loader2, PieChart } from 'lucide-react';
import { printShareReport } from '@/utils/printShareReport';
import { useNavigate } from 'react-router-dom';
import ExportMenu from '@/components/ExportMenu';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import DashboardLayout from '@/components/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateMySharePDF, generateDistributionsPDF, generateComprehensiveBeneficiaryPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';
import { useMyAdvanceRequests, usePaidAdvancesTotal, useCarryforwardBalance, useMyCarryforwards } from '@/hooks/useAdvanceRequests';
import AdvanceRequestDialog from '@/components/beneficiaries/AdvanceRequestDialog';
import { useContractsSafeByFiscalYear } from '@/hooks/useContracts';
import { useMyShare } from '@/hooks/useMyShare';
import { useAppSettings } from '@/hooks/useAppSettings';
import PageHeaderCard from '@/components/PageHeaderCard';

import { fmt } from '@/utils/format';

const MySharePage = () => {
  const queryClient = useQueryClient();
  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['income'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['beneficiaries-safe'] });
    queryClient.invalidateQueries({ queryKey: ['my-distributions'] });
    queryClient.invalidateQueries({ queryKey: ['total-beneficiary-percentage'] });
  };
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, noPublishedYears } = useFiscalYear();
  const selectedFY = fiscalYear;
  const navigate = useNavigate();
  // BEN-11: حالة تحميل PDF لمنع الضغط المزدوج
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const {
    beneficiaries,
    currentAccount,
    isAccountMissing,
    totalIncome,
    totalExpenses,
    netAfterVat,
    netAfterZakat,
    adminShare,
    waqifShare,
    waqfRevenue,
    waqfCorpusManual,
    vatAmount,
    zakatAmount,
    netAfterExpenses,
    availableAmount,
    incomeBySource,
    expensesByTypeExcludingVat,
    isLoading: finLoading,
    isError: finError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  const { currentBeneficiary, myShare, pctLoading } = useMyShare({ beneficiaries, availableAmount });

  const { data: distributions = [], isLoading: distLoading } = useQuery({
    queryKey: ['my-distributions', currentBeneficiary?.id, fiscalYearId],
    queryFn: async () => {
      if (!currentBeneficiary?.id) return [];
      const { data, error } = await supabase
        .from('distributions')
        .select('*, account:accounts(*)')
        .eq('beneficiary_id', currentBeneficiary.id)
        .order('date', { ascending: false })
        .limit(200); // O-04 fix: prevent unbounded query

      if (error) throw error;
      return data;
    },
    enabled: !!currentBeneficiary?.id,
  });

  // سُلف المستفيد
   const { data: myAdvances = [] } = useMyAdvanceRequests(currentBeneficiary?.id ?? undefined);
  const { data: paidAdvancesTotal = 0 } = usePaidAdvancesTotal(currentBeneficiary?.id ?? undefined, fiscalYearId === 'all' ? undefined : fiscalYearId);
  const { data: carryforwardBalance = 0 } = useCarryforwardBalance(currentBeneficiary?.id ?? undefined, fiscalYearId === 'all' ? undefined : fiscalYearId);
  const { data: myCarryforwards = [] } = useMyCarryforwards(currentBeneficiary?.id ?? undefined);
  const { data: contracts = [] } = useContractsSafeByFiscalYear(fiscalYearId);

  const { getJsonSetting } = useAppSettings();
  const advanceSettings = getJsonSetting('advance_settings', { enabled: true, min_amount: 500, max_percentage: 50 });
  const advancesEnabled = advanceSettings.enabled;
  const beneficiariesShare = availableAmount;
  const isClosed = selectedFY?.status === 'closed';

  // F6: فلترة التوزيعات بالسنة المالية عند عدم وجود حساب ختامي
  const filteredDistributions = currentAccount
    ? distributions.filter(d => d.account_id === currentAccount.id)
    : (fiscalYearId && fiscalYearId !== 'all'
        ? distributions.filter(d => d.fiscal_year_id === fiscalYearId)
        : distributions);

  const totalReceived = filteredDistributions
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + safeNumber(d.amount), 0);

  const pendingAmount = filteredDistributions
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + safeNumber(d.amount), 0);

  // BEN-11: wrapper لمنع الضغط المزدوج أثناء توليد PDF
  const withPdfLoading = (fn: () => Promise<void>) => async () => {
    if (isPdfLoading) return;
    setIsPdfLoading(true);
    try { await fn(); } finally { setIsPdfLoading(false); }
  };

  const handleDownloadPDF = withPdfLoading(async () => {
    if (!currentBeneficiary) return;
    if (!isClosed) {
      toast.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية');
      return;
    }
    try {
      const shareAmt = myShare;
      const advAmt = paidAdvancesTotal;
      const afterAdv = Math.max(0, shareAmt - advAmt);
      const actualCf = Math.min(carryforwardBalance, afterAdv);

      await generateMySharePDF({
        beneficiaryName: currentBeneficiary.name ?? 'غير معروف',
        sharePercentage: currentBeneficiary.share_percentage ?? 0,
        myShare,
        totalReceived,
        pendingAmount,
        netRevenue: netAfterZakat,
        adminShare,
        waqifShare,
        beneficiariesShare,
        paidAdvances: advAmt,
        carryforwardDeducted: Math.round(actualCf * 100) / 100,
        fiscalYear: selectedFY?.label,
        distributions: filteredDistributions.map(d => ({
          date: d.date,
          fiscalYear: d.account?.fiscal_year || '-',
          amount: Number(d.amount),
          status: d.status,
        })),
      }, pdfWaqfInfo);
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير PDF');
    }
  });

  const handleDownloadDistributionsPDF = withPdfLoading(async () => {
    if (!currentBeneficiary) return;
    if (!isClosed) {
      toast.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية');
      return;
    }
    try {
      const shareAmount = myShare;
      const advances = paidAdvancesTotal;
      const carryforward = carryforwardBalance;
      const totalDeductions = advances + carryforward;
      const rawNet = shareAmount - totalDeductions;
      const net = Math.max(0, rawNet);
      const deficit = rawNet < 0 ? Math.round(Math.abs(rawNet) * 100) / 100 : 0;

      const afterAdvances = Math.max(0, shareAmount - advances);
      const actualCarryforward = Math.min(carryforward, afterAdvances);

      await generateDistributionsPDF({
        fiscalYearLabel: selectedFY?.label || '',
        availableAmount: shareAmount,
        distributions: [{
          beneficiary_name: currentBeneficiary.name ?? 'غير معروف',
          share_percentage: currentBeneficiary.share_percentage ?? 0,
          share_amount: shareAmount,
          advances_paid: advances,
          carryforward_deducted: Math.round(actualCarryforward * 100) / 100,
          net_amount: net,
          deficit,
        }],
      }, pdfWaqfInfo);
      toast.success('تم تحميل تقرير التوزيعات بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير التقرير');
    }
  });

  const handlePrintReport = () => {
    if (!currentBeneficiary) return;
    printShareReport({
      beneficiaryName: currentBeneficiary.name ?? 'غير معروف',
      beneficiariesShare,
      myShare,
      paidAdvancesTotal,
      carryforwardBalance,
      fiscalYearLabel: selectedFY?.label,
      filteredDistributions,
    });
  };

  const handleDownloadComprehensivePDF = withPdfLoading(async () => {
    if (!currentBeneficiary) return;
    if (!isClosed) {
      toast.warning('السنة المالية لم تُغلق بعد — الأرقام غير نهائية');
      return;
    }
    try {
      await generateComprehensiveBeneficiaryPDF({
        beneficiaryName: currentBeneficiary.name ?? 'غير معروف',
        fiscalYear: selectedFY?.label || '',
        totalIncome,
        totalExpenses,
        netAfterExpenses,
        vatAmount,
        netAfterVat,
        zakatAmount,
        netAfterZakat,
        adminShare,
        waqifShare,
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
          rent_amount: Number(c.rent_amount),
          status: c.status ?? '',
        })),
        distributions: filteredDistributions.map(d => ({
          date: d.date,
          fiscalYear: d.account?.fiscal_year || '-',
          amount: Number(d.amount),
          status: d.status,
        })),
      }, pdfWaqfInfo);
      toast.success('تم تحميل التقرير الشامل بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير التقرير الشامل');
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/20 text-success hover:bg-success/30"><CheckCircle className="w-3 h-3 ml-1" /> مستلم</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning hover:bg-warning/30"><Clock className="w-3 h-3 ml-1" /> معلق</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30"><XCircle className="w-3 h-3 ml-1" /> ملغى</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAdvanceStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
      pending: { label: 'قيد المراجعة', cls: 'bg-warning/20 text-warning', icon: Clock },
      approved: { label: 'معتمد', cls: 'bg-status-approved/20 text-status-approved-foreground', icon: CheckCircle },
      paid: { label: 'مصروف', cls: 'bg-success/20 text-success', icon: Banknote },
      rejected: { label: 'مرفوض', cls: 'bg-destructive/20 text-destructive', icon: XCircle },
    };
    const s = map[status] || { label: status, cls: 'bg-muted text-muted-foreground', icon: Clock };
    const Icon = s.icon;
    // BEN-18: إصلاح hover class — حذف template literal الخاطئ
    return <Badge className={s.cls}><Icon className="w-3 h-3 ml-1" />{s.label}</Badge>;
  };

  // F4: عرض skeleton أثناء التحميل
  if (finLoading || distLoading || pctLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6">
          <DashboardSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5">
          <PageHeaderCard title="حصتي من الريع" icon={Wallet} description="تفاصيل حصتك من ريع الوقف" />
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  if (finError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentBeneficiary) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <UserX className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-bold">لم يتم العثور على سجل المستفيد</h2>
          <p className="text-muted-foreground text-center">حسابك غير مرتبط بسجل مستفيد. يرجى التواصل مع ناظر الوقف.</p>
        </div>
      </DashboardLayout>
    );
  }

  // BEN-17: عرض رسالة الحساب المفقود فقط للسنوات المُقفلة
  if (isAccountMissing && isClosed) {
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
          title="حصتي من الريع"
          description="تفاصيل حصتك من ريع الوقف"
          icon={Wallet}
          actions={
            <div className="flex items-center gap-2">
              {advancesEnabled && currentBeneficiary && (
                <AdvanceRequestDialog
                  beneficiaryId={currentBeneficiary?.id || ''}
                  fiscalYearId={fiscalYearId === 'all' ? undefined : fiscalYearId}
                  estimatedShare={myShare}
                  paidAdvances={paidAdvancesTotal}
                  carryforwardBalance={carryforwardBalance}
                  minAmount={advanceSettings.min_amount}
                  maxPercentage={advanceSettings.max_percentage}
                  isFiscalYearActive={selectedFY?.status !== 'closed'}
                />
              )}
              <ExportMenu
                onPrint={handlePrintReport}
                onExportPdf={handleDownloadPDF}
                extraItems={[
                  { label: 'تقرير التوزيع', icon: FileDown, onClick: handleDownloadDistributionsPDF },
                  { label: 'تقرير شامل', icon: FileDown, onClick: handleDownloadComprehensivePDF },
                ]}
              />
            </div>
          }
        />

        {/* Share Summary - cards */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${advancesEnabled ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 sm:gap-4`}>
          {/* BEN-13: بطاقة نسبة الحصة */}
          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <PieChart className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">نسبة الحصة</p>
                  <p className="text-base sm:text-2xl font-bold truncate">{currentBeneficiary.share_percentage ?? 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BEN-14: الحصة المستحقة — مشروطة بحالة السنة */}
          <Card className="shadow-sm gradient-primary text-primary-foreground">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-primary-foreground/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-primary-foreground/90">الحصة المستحقة</p>
                  {!isClosed ? (
                    <p className="text-sm font-medium text-primary-foreground/70">تُحسب عند إغلاق السنة</p>
                  ) : (
                    <p className="text-base sm:text-2xl font-bold truncate">{fmt(myShare)} ر.س</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-success/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">المبالغ المستلمة</p>
                  <p className="text-base sm:text-2xl font-bold text-success truncate">{fmt(totalReceived)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-warning/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">المبالغ المعلقة</p>
                  <p className="text-base sm:text-2xl font-bold text-warning truncate">{fmt(pendingAmount)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {advancesEnabled && (
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-accent/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <Banknote className="w-4 h-4 sm:w-6 sm:h-6 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">السُلف المصروفة</p>
                  <p className="text-base sm:text-2xl font-bold text-accent-foreground truncate">{fmt(paidAdvancesTotal)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* تنبيه السنة النشطة — BUG-CF2 */}
        {!isClosed && currentBeneficiary && (
          <Card className="shadow-sm border-info/30 bg-info/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">السنة المالية لم تُغلق بعد</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ستظهر حصتك من الريع بعد إغلاق السنة المالية من قِبل الناظر.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* تنبيه الفروق المرحّلة */}
        {carryforwardBalance > 0 && (
          <Card className="shadow-sm border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">فروق مرحّلة من سنوات سابقة</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    لديك مبلغ <span className="font-bold text-warning">{fmt(carryforwardBalance)} ر.س</span> مرحّل من سُلف سابقة تجاوزت حصتك.
                    سيتم خصمه تلقائياً من حصتك عند التوزيع القادم.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Link to Disclosure */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                لمعرفة تفاصيل احتساب الحصة والتسلسل المالي الكامل
              </p>
              <Button
                variant="link"
                className="text-primary gap-1"
                onClick={() => navigate('/beneficiary/disclosure')}
              >
                <FileText className="w-4 h-4" />
                صفحة الإفصاح السنوي
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Distributions History */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>سجل التوزيعات</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDistributions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد توزيعات مسجلة بعد</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {filteredDistributions.map((dist) => (
                    <div key={dist.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{fmt(Number(dist.amount))} ر.س</span>
                        {getStatusBadge(dist.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">التاريخ</p>
                          <p className="font-medium">{new Date(dist.date).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">السنة المالية</p>
                          <p className="font-medium">{dist.account?.fiscal_year || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="overflow-x-auto hidden md:block">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">السنة المالية</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDistributions.map((dist) => (
                        <TableRow key={dist.id}>
                          <TableCell>{new Date(dist.date).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>{dist.account?.fiscal_year || '-'}</TableCell>
                          <TableCell className="font-bold">{fmt(Number(dist.amount))} ر.س</TableCell>
                          <TableCell>{getStatusBadge(dist.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* سجل السُلف */}
        {advancesEnabled && myAdvances.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                سجل السُلف
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {myAdvances.map(adv => {
                  const borderColor = adv.status === 'paid' ? 'border-r-success' : adv.status === 'approved' ? 'border-r-primary' : adv.status === 'rejected' ? 'border-r-destructive' : 'border-r-warning';
                  return (
                    <div key={adv.id} className={`border rounded-lg border-r-4 ${borderColor} p-3 space-y-2`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{fmt(Number(adv.amount))} ر.س</span>
                        {getAdvanceStatusBadge(adv.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">التاريخ</p>
                          <p className="font-medium">{new Date(adv.created_at).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">السبب</p>
                          <p className="font-medium truncate">{adv.reason || '—'}</p>
                        </div>
                      </div>
                      {adv.status === 'paid' && adv.paid_at && (
                        <p className="text-xs text-success">تاريخ الصرف: {new Date(adv.paid_at).toLocaleDateString('ar-SA')}</p>
                      )}
                      {adv.status === 'rejected' && adv.rejection_reason && (
                        <div className="flex items-start gap-1.5 p-2 bg-destructive/5 rounded text-xs text-destructive">
                          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{adv.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Desktop table */}
              <div className="overflow-x-auto hidden md:block">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">السبب</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myAdvances.map(adv => (
                      <TableRow key={adv.id}>
                        <TableCell>{new Date(adv.created_at).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell className="font-bold">{fmt(Number(adv.amount))} ر.س</TableCell>
                        <TableCell className="max-w-[200px] truncate">{adv.reason || '—'}</TableCell>
                        <TableCell>
                          {getAdvanceStatusBadge(adv.status)}
                          {adv.status === 'rejected' && adv.rejection_reason && (
                            <p className="text-xs text-muted-foreground mt-1">{adv.rejection_reason}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* سجل الفروق المرحّلة */}
        {myCarryforwards.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                سجل الفروق المرحّلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {myCarryforwards.map(cf => (
                  <div key={cf.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-destructive">{fmt(Number(cf.amount))} ر.س</span>
                      <Badge className={cf.status === 'active' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}>
                        {cf.status === 'active' ? 'نشط' : 'تمت التسوية'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">التاريخ</p>
                        <p className="font-medium">{new Date(cf.created_at).toLocaleDateString('ar-SA')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">ملاحظات</p>
                        <p className="font-medium truncate">{cf.notes || '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="overflow-x-auto hidden md:block">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myCarryforwards.map(cf => (
                      <TableRow key={cf.id}>
                        <TableCell>{new Date(cf.created_at).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell className="font-bold text-destructive">{fmt(Number(cf.amount))} ر.س</TableCell>
                        <TableCell>
                          <Badge className={cf.status === 'active' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}>
                            {cf.status === 'active' ? 'نشط' : 'تمت التسوية'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {cf.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MySharePage;
