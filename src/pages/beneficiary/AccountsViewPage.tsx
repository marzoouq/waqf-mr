import { Wallet, PieChart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeaderCard, DashboardLayout } from '@/components/layout';
import { ExportMenu, RequirePublishedYears, DashboardSkeleton, ErrorState } from '@/components/common';
import { AccountsSummaryCards, AccountsViewMyShare } from '@/components/accounts';
import UnlinkedAccountNotice from '@/components/beneficiary/UnlinkedAccountNotice';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAccountsViewPage } from '@/hooks/page/beneficiary';

const AccountsViewPage = () => {
  const { noPublishedYears } = useFiscalYear();
  const {
    finLoading, finError,
    isAccountMissing, selectedFY, currentBeneficiary,
    totalIncome, totalExpenses, myShare,
    waqfCorpusPrevious, grandTotal, netAfterExpenses, vatAmount, netAfterVat,
    zakatAmount, netAfterZakat, adminShare, waqifShare, waqfRevenue,
    waqfCorpusManual, distributionsAmount, remainingBalance,
    adminPercent, waqifPercent, isClosed,
    handleRetry, handleExportPdf, navigate,
  } = useAccountsViewPage();

  // B2: حارس السنوات المنشورة قبل أي فرع
  if (noPublishedYears) {
    return <RequirePublishedYears title="الحسابات الختامية" icon={Wallet} description="ملخص الأرقام النهائية"><></></RequirePublishedYears>;
  }

  if (finLoading) return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;

  // B11: استبدال البلوك اليدوي بـ ErrorState الموحّد
  if (finError) {
    return <ErrorState message="حدث خطأ أثناء تحميل البيانات" onRetry={handleRetry} />;
  }

  // H3: تحقّق من ربط المستفيد قبل أي رسالة عن الحساب الختامي
  if (!currentBeneficiary) {
    return <UnlinkedAccountNotice />;
  }

  if (isAccountMissing && selectedFY?.status === 'closed') {
    return (
      <ErrorState
        variant="warning"
        message="لم يتم العثور على الحساب الختامي"
        description="لا يوجد حساب ختامي مسجل لهذه السنة المالية بعد."
        onRetry={handleRetry}
        retryLabel="إعادة تحميل"
      />
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

        <AccountsSummaryCards
          waqfCorpusPrevious={waqfCorpusPrevious}
          totalIncome={totalIncome}
          grandTotal={grandTotal}
          totalExpenses={totalExpenses}
          netAfterExpenses={netAfterExpenses}
          manualVat={vatAmount}
          netAfterVat={netAfterVat}
          zakatAmount={zakatAmount}
          netAfterZakat={netAfterZakat}
          adminPercent={adminPercent}
          adminShare={adminShare}
          waqifPercent={waqifPercent}
          waqifShare={waqifShare}
          waqfRevenue={waqfRevenue}
          waqfCorpusManual={waqfCorpusManual}
          manualDistributions={distributionsAmount}
          remainingBalance={remainingBalance}
          isClosed={isClosed}
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
