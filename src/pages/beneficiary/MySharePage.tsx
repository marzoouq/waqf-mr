import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Clock, CheckCircle, AlertCircle, FileText, RefreshCw, UserX, Banknote, FileDown, Printer } from 'lucide-react';
import { printShareReport } from '@/utils/printShareReport';
import { useNavigate } from 'react-router-dom';
import ExportMenu from '@/components/ExportMenu';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import DashboardLayout from '@/components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
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
import { useContractsByFiscalYear } from '@/hooks/useContracts';

const MySharePage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, noPublishedYears } = useFiscalYear();
  const selectedFY = fiscalYear;
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);

  const { data: distributions = [], isLoading: distLoading } = useQuery({
    queryKey: ['my-distributions', currentBeneficiary?.id],
    queryFn: async () => {
      if (!currentBeneficiary?.id) return [];
      const { data, error } = await supabase
        .from('distributions')
        .select('*, account:accounts(*)')
        .eq('beneficiary_id', currentBeneficiary.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentBeneficiary?.id,
  });

  // سُلف المستفيد
  const { data: myAdvances = [] } = useMyAdvanceRequests(currentBeneficiary?.id);
  const { data: paidAdvancesTotal = 0 } = usePaidAdvancesTotal(currentBeneficiary?.id, fiscalYearId === 'all' ? undefined : fiscalYearId);
  const { data: carryforwardBalance = 0 } = useCarryforwardBalance(currentBeneficiary?.id, fiscalYearId === 'all' ? undefined : fiscalYearId);
  const { data: myCarryforwards = [] } = useMyCarryforwards(currentBeneficiary?.id);
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);

  const beneficiariesShare = availableAmount;
  const totalBeneficiaryPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0);

  const myShare = currentBeneficiary
    ? (totalBeneficiaryPercentage > 0
        ? beneficiariesShare * currentBeneficiary.share_percentage / totalBeneficiaryPercentage
        : 0)
    : 0;

  const filteredDistributions = currentAccount
    ? distributions.filter(d => d.account_id === currentAccount.id)
    : distributions;

  const totalReceived = filteredDistributions
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const pendingAmount = filteredDistributions
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const handleDownloadPDF = async () => {
    if (!currentBeneficiary) return;
    try {
      await generateMySharePDF({
        beneficiaryName: currentBeneficiary.name,
        sharePercentage: currentBeneficiary.share_percentage,
        myShare,
        totalReceived,
        pendingAmount,
        netRevenue: netAfterZakat,
        adminShare,
        waqifShare,
        beneficiariesShare,
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
  };

  const handleDownloadDistributionsPDF = async () => {
    if (!currentBeneficiary) return;
    try {
      const shareAmount = myShare;
      const advances = paidAdvancesTotal;
      const carryforward = carryforwardBalance;
      const totalDeductions = advances + carryforward;
      const rawNet = shareAmount - totalDeductions;
      const net = Math.max(0, rawNet);
      const deficit = rawNet < 0 ? Math.abs(rawNet) : 0;

      await generateDistributionsPDF({
        fiscalYearLabel: selectedFY?.label || '',
        availableAmount: beneficiariesShare,
        distributions: [{
          beneficiary_name: currentBeneficiary.name,
          share_percentage: currentBeneficiary.share_percentage,
          share_amount: shareAmount,
          advances_paid: advances,
          carryforward_deducted: Math.min(carryforward, shareAmount - advances > 0 ? shareAmount - advances : 0),
          net_amount: net,
          deficit,
        }],
      }, pdfWaqfInfo);
      toast.success('تم تحميل تقرير التوزيعات بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير التقرير');
    }
  };

  const handlePrintReport = () => {
    if (!currentBeneficiary) return;
    printShareReport({
      beneficiaryName: currentBeneficiary.name,
      beneficiariesShare,
      myShare,
      paidAdvancesTotal,
      carryforwardBalance,
      fiscalYearLabel: selectedFY?.label,
      filteredDistributions,
    });
  };

  const handleDownloadComprehensivePDF = async () => {
    if (!currentBeneficiary) return;
    try {
      await generateComprehensiveBeneficiaryPDF({
        beneficiaryName: currentBeneficiary.name,
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
          contract_number: c.contract_number,
          tenant_name: c.tenant_name,
          rent_amount: Number(c.rent_amount),
          status: c.status,
        })),
        distributions: filteredDistributions.map(d => ({
          date: d.date,
          fiscalYear: (d as { account?: { fiscal_year?: string } }).account?.fiscal_year || '-',
          amount: Number(d.amount),
          status: d.status,
        })),
      }, pdfWaqfInfo);
      toast.success('تم تحميل التقرير الشامل بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير التقرير الشامل');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/20 text-success hover:bg-success/30"><CheckCircle className="w-3 h-3 ml-1" /> مستلم</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning hover:bg-warning/30"><Clock className="w-3 h-3 ml-1" /> معلق</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAdvanceStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'قيد المراجعة', cls: 'bg-warning/20 text-warning' },
      approved: { label: 'معتمد', cls: 'bg-info/20 text-info' },
      paid: { label: 'مصروف', cls: 'bg-success/20 text-success' },
      rejected: { label: 'مرفوض', cls: 'bg-destructive/20 text-destructive' },
    };
    const s = map[status] || map.pending;
    return <Badge className={`${s.cls} hover:${s.cls}`}>{s.label}</Badge>;
  };

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display">حصتي من الريع</h1>
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
          <Button onClick={() => window.location.reload()} className="gap-2">
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

  if (isAccountMissing) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-warning" />
          <h2 className="text-xl font-bold">لم يتم العثور على الحساب الختامي</h2>
          <p className="text-muted-foreground text-center max-w-md">
            لا يوجد حساب ختامي مسجل لهذه السنة المالية بعد. يرجى التواصل مع ناظر الوقف أو المحاولة لاحقاً.
          </p>
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة تحميل
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">حصتي من الريع</h1>
            <p className="text-muted-foreground mt-1 text-sm">تفاصيل حصتك من ريع الوقف</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {currentBeneficiary && (
              <AdvanceRequestDialog
                beneficiaryId={currentBeneficiary.id}
                fiscalYearId={fiscalYearId === 'all' ? undefined : fiscalYearId}
                estimatedShare={myShare}
                paidAdvances={paidAdvancesTotal}
                carryforwardBalance={carryforwardBalance}
              />
            )}
            <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-1.5">
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadDistributionsPDF} className="gap-1.5">
              <FileDown className="w-4 h-4" />
              تقرير التوزيع
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadComprehensivePDF} className="gap-1.5">
              <FileDown className="w-4 h-4" />
              تقرير شامل
            </Button>
            <ExportMenu onExportPdf={handleDownloadPDF} />
          </div>
        </div>

        {/* Share Summary - 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-sm gradient-primary text-primary-foreground">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-primary-foreground/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-primary-foreground/90">الحصة المستحقة</p>
                  <p className="text-base sm:text-2xl font-bold truncate">{myShare.toLocaleString()} ر.س</p>
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
                  <p className="text-base sm:text-2xl font-bold text-success truncate">{totalReceived.toLocaleString()} ر.س</p>
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
                  <p className="text-base sm:text-2xl font-bold text-warning truncate">{pendingAmount.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-accent/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <Banknote className="w-4 h-4 sm:w-6 sm:h-6 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">السُلف المصروفة</p>
                  <p className="text-base sm:text-2xl font-bold text-accent-foreground truncate">{paidAdvancesTotal.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* تنبيه الفروق المرحّلة */}
        {carryforwardBalance > 0 && (
          <Card className="shadow-sm border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">فروق مرحّلة من سنوات سابقة</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    لديك مبلغ <span className="font-bold text-warning">{carryforwardBalance.toLocaleString()} ر.س</span> مرحّل من سُلف سابقة تجاوزت حصتك.
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
              <Table>
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
                      <TableCell className="font-bold">{Number(dist.amount).toLocaleString()} ر.س</TableCell>
                      <TableCell>{getStatusBadge(dist.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* سجل السُلف */}
        {myAdvances.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                سجل السُلف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
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
                      <TableCell className="font-bold">{Number(adv.amount).toLocaleString()} ر.س</TableCell>
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
              <Table>
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
                      <TableCell className="font-bold text-destructive">{Number(cf.amount).toLocaleString()} ر.س</TableCell>
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
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MySharePage;
