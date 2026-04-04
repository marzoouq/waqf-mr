import { Wallet, PieChart, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeaderCard, DashboardLayout } from '@/components/layout';
import { ExportMenu, RequirePublishedYears, DashboardSkeleton } from '@/components/common';
import { AccountsViewSummary, AccountsViewMyShare } from '@/components/accounts';
import { useAccountsViewPage } from '@/hooks/page/beneficiary';

const AccountsViewPage = () => {
  const {
    finLoading, finError,
    isAccountMissing, selectedFY, currentBeneficiary,
    totalIncome, totalExpenses, netAfterZakat, availableAmount, myShare,
    handleRetry, handleExportPdf, navigate,
  } = useAccountsViewPage();

  if (finError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <Button onClick={handleRetry} className="gap-2"><RefreshCw className="w-4 h-4" /> إعادة المحاولة</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (finLoading) return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;

  if (isAccountMissing && selectedFY?.status === 'closed') {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-warning" />
          <h2 className="text-xl font-bold">لم يتم العثور على الحساب الختامي</h2>
          <p className="text-muted-foreground text-center max-w-md">لا يوجد حساب ختامي مسجل لهذه السنة المالية بعد.</p>
          <Button onClick={handleRetry} className="gap-2"><RefreshCw className="w-4 h-4" /> إعادة تحميل</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentBeneficiary) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-warning" />
          <h2 className="text-xl font-bold">حسابك غير مرتبط</h2>
          <p className="text-muted-foreground text-center max-w-md">حسابك لم يُربط بسجل مستفيد بعد. يرجى التواصل مع ناظر الوقف.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RequirePublishedYears title="الحسابات الختامية" icon={Wallet} description="ملخص الأرقام النهائية">
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="الحسابات الختامية"
          description="ملخص الأرقام النهائية للحسابات الختامية"
          icon={Wallet}
          actions={<ExportMenu onExportPdf={handleExportPdf} />}
        />

        <AccountsViewSummary
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          netAfterZakat={netAfterZakat}
          availableAmount={availableAmount}
          myShare={myShare}
        />

        {currentBeneficiary && <AccountsViewMyShare myShare={myShare} />}

        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">تبحث عن التفاصيل الكاملة؟</p>
                <p className="text-xs text-muted-foreground mt-1">جداول العقود وتفصيل الإيرادات والمصروفات متاحة في صفحة الإفصاح السنوي</p>
              </div>
              <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10 shrink-0" onClick={() => navigate('/beneficiary/disclosure')}>
                <PieChart className="w-4 h-4" />الإفصاح السنوي
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default AccountsViewPage;
