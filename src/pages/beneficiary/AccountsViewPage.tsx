import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, PieChart, Calculator, AlertCircle, RefreshCw } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { generateAccountsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import { useNavigate } from 'react-router-dom';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';

const AccountsViewPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { fiscalYearId, fiscalYear: selectedFY, noPublishedYears } = useFiscalYear();

  const {
    beneficiaries,
    currentAccount,
    isAccountMissing,
    totalIncome,
    totalExpenses,
    netAfterExpenses,
    waqfCorpusPrevious,
    vatAmount,
    netAfterVat,
    zakatAmount,
    adminShare,
    waqifShare,
    waqfRevenue,
    waqfCorpusManual,
    distributionsAmount,
    grandTotal,
    availableAmount,
    incomeBySource,
    expensesByType,
    isLoading: finLoading,
    isError: finError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);

  const myShare = currentBeneficiary
    ? (availableAmount * Number(currentBeneficiary.share_percentage)) / 100
    : 0;

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

  if (finLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display">الحسابات الختامية</h1>
          <NoPublishedYearsNotice />
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">الحسابات الختامية</h1>
            <p className="text-muted-foreground mt-1 text-sm">ملخص الأرقام النهائية للحسابات الختامية</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <ExportMenu onExportPdf={async () => {
              try {
                await generateAccountsPDF({
                  contracts: [],
                  incomeBySource,
                  expensesByType,
                  totalIncome,
                  totalExpenses,
                  netRevenue: netAfterVat,
                  adminShare,
                  waqifShare,
                  waqfRevenue,
                  beneficiaries: beneficiaries.map(b => ({
                    name: b.name,
                    share_percentage: Number(b.share_percentage),
                  })),
                  vatAmount,
                  zakatAmount,
                  waqfCorpusPrevious,
                  grandTotal,
                  netAfterExpenses,
                  netAfterVat,
                  waqfCapital: waqfCorpusManual,
                  distributionsAmount,
                  availableAmount,
                  remainingBalance: availableAmount - distributionsAmount,
                }, pdfWaqfInfo);
                toast.success('تم تصدير الحسابات الختامية بنجاح');
              } catch {
                toast.error('حدث خطأ أثناء تصدير PDF');
              }
            }} />
          </div>
        </div>

        {/* Summary */}
        <Card className="shadow-sm gradient-hero text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
              ملخص الحسابات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">إجمالي الدخل</p>
                <p className="text-sm sm:text-xl font-bold truncate">{totalIncome.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">إجمالي المصروفات</p>
                <p className="text-sm sm:text-xl font-bold truncate">{totalExpenses.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">الصافي بعد الضريبة</p>
                <p className="text-sm sm:text-xl font-bold truncate">{netAfterVat.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">حصة الناظر</p>
                <p className="text-sm sm:text-xl font-bold truncate">{adminShare.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">حصة الواقف</p>
                <p className="text-sm sm:text-xl font-bold truncate">{waqifShare.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">ريع الوقف</p>
                <p className="text-sm sm:text-xl font-bold truncate">{waqfRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Share Highlight */}
        {currentBeneficiary && (
          <Card className="shadow-sm bg-primary/10 border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">حصتي المستحقة</p>
                  <p className="text-xl sm:text-3xl font-bold text-primary truncate">{myShare.toLocaleString()} ر.س</p>
                </div>
                <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-primary/30 shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Link to Disclosure for full details */}
        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">تبحث عن التفاصيل الكاملة؟</p>
                <p className="text-xs text-muted-foreground mt-1">
                  جداول العقود وتفصيل الإيرادات والمصروفات متاحة في صفحة الإفصاح السنوي
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 border-primary/30 hover:bg-primary/10 shrink-0"
                onClick={() => navigate('/beneficiary/disclosure')}
              >
                <PieChart className="w-4 h-4" />
                الإفصاح السنوي
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AccountsViewPage;
