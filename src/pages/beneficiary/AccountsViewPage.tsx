import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, PieChart, Calculator, AlertCircle, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import PageHeaderCard from '@/components/PageHeaderCard';
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
import { useMyShare } from '@/hooks/useMyShare';
import { safeNumber } from '@/utils/safeNumber';

const AccountsViewPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = () => queryClient.invalidateQueries();
  const pdfWaqfInfo = usePdfWaqfInfo();
  const navigate = useNavigate();
  

  const { fiscalYearId, fiscalYear: selectedFY, noPublishedYears } = useFiscalYear();

  const {
    beneficiaries,
    
    isAccountMissing,
    totalIncome,
    totalExpenses,
    netAfterExpenses,
    waqfCorpusPrevious,
    vatAmount,
    netAfterVat,
    zakatAmount,
    netAfterZakat,
    adminShare,
    waqifShare,
    waqfRevenue,
    waqfCorpusManual,
    distributionsAmount,
    grandTotal,
    availableAmount,
    incomeBySource,
    expensesByType: _ebt,
    expensesByTypeExcludingVat,
    remainingBalance,
    isLoading: finLoading,
    isError: finError,
  } = useFinancialSummary(fiscalYearId, selectedFY?.label, { fiscalYearStatus: selectedFY?.status });

  const { currentBeneficiary, myShare } = useMyShare({ beneficiaries, availableAmount });

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5">
          <PageHeaderCard title="الحسابات الختامية" icon={Wallet} description="ملخص الأرقام النهائية" />
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

  if (finLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
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
          title="الحسابات الختامية"
          description="ملخص الأرقام النهائية للحسابات الختامية"
          icon={Wallet}
          actions={
            <ExportMenu onExportPdf={async () => {
              try {
                await generateAccountsPDF({
                  contracts: [],
                  incomeBySource,
                  expensesByType: expensesByTypeExcludingVat,
                  totalIncome,
                  totalExpenses,
                  netRevenue: netAfterZakat,
                  adminShare,
                  waqifShare,
                  waqfRevenue,
                   beneficiaries: beneficiaries.map(b => ({
                    name: b.name ?? 'غير معروف',
                    share_percentage: safeNumber(b.share_percentage),
                  })),
                  vatAmount,
                  zakatAmount,
                  waqfCorpusPrevious,
                  grandTotal,
                  netAfterExpenses,
                  netAfterVat,
                  waqfCorpusManual,
                  distributionsAmount,
                  availableAmount,
                  remainingBalance,
                }, pdfWaqfInfo);
                toast.success('تم تصدير الحسابات الختامية بنجاح');
              } catch {
                toast.error('حدث خطأ أثناء تصدير PDF');
              }
            }} />
          }
        />

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
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">الصافي بعد الزكاة</p>
                <p className="text-sm sm:text-xl font-bold truncate">{netAfterZakat.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">الإجمالي القابل للتوزيع</p>
                <p className="text-sm sm:text-xl font-bold truncate">{availableAmount.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-primary-foreground/10 rounded-lg col-span-2">
                <p className="text-[10px] sm:text-sm text-primary-foreground/90">حصتي المستحقة</p>
                <p className="text-sm sm:text-xl font-bold truncate">{myShare.toLocaleString()}</p>
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
