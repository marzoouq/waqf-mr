import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertCircle, RefreshCw, FileDown, Info } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import DashboardLayout from '@/components/DashboardLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import RequirePublishedYears from '@/components/RequirePublishedYears';
import PageHeaderCard from '@/components/PageHeaderCard';
import DisclosureSummaryCards from '@/components/disclosure/DisclosureSummaryCards';
import DisclosureContractsSection from '@/components/disclosure/DisclosureContractsSection';
import DisclosureFinancialStatement from '@/components/disclosure/DisclosureFinancialStatement';
import { useDisclosurePage } from '@/hooks/page/useDisclosurePage';

const DisclosurePage = () => {
  const {
    finLoading, finError, pctLoading, contractsLoading, isAccountMissing,
    selectedFY, handleRetry,
    totalIncome, totalExpenses, vatAmount, zakatAmount, waqfCorpusManual,
    waqfCorpusPrevious, grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, adminPct, waqifPct, beneficiariesShare,
    incomeBySource, expensesByTypeExcludingVat,
    currentBeneficiary, myShare, gregorianFiscalYear,
    contracts,
    handleDownloadPDF, handleDownloadComprehensivePDF,
  } = useDisclosurePage();

  if (finLoading || pctLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (finError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <p className="text-muted-foreground text-center max-w-md">يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.</p>
          <Button onClick={handleRetry} className="gap-2"><RefreshCw className="w-4 h-4" /> إعادة المحاولة</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentBeneficiary && !finLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-warning" />
          <h2 className="text-xl font-bold text-foreground">حسابك غير مرتبط</h2>
          <p className="text-muted-foreground text-center max-w-md">حسابك لم يُربط بسجل مستفيد بعد. يرجى التواصل مع ناظر الوقف.</p>
        </div>
      </DashboardLayout>
    );
  }

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

  return (
    <RequirePublishedYears title="الإفصاح السنوي" icon={FileText}>
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <PageHeaderCard
            title="الإفصاح السنوي"
            description={`السنة المالية: ${gregorianFiscalYear}`}
            icon={FileText}
            actions={
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadComprehensivePDF}>
                  <FileDown className="w-4 h-4" />تقرير شامل
                </Button>
                <ExportMenu onExportPdf={handleDownloadPDF} />
              </div>
            }
          />

          <DisclosureSummaryCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            myShare={myShare}
            waqfCorpusPrevious={waqfCorpusPrevious}
          />

          {/* تنبيه السنة النشطة */}
          {myShare === 0 && !isAccountMissing && selectedFY?.status !== 'closed' && currentBeneficiary && (
            <Card className="shadow-sm border-info/30 bg-info/5">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">السنة المالية لم تُغلق بعد</p>
                  <p className="text-sm text-muted-foreground mt-1">ستظهر حصتك من الريع بعد إغلاق السنة المالية من قِبل الناظر.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <DisclosureContractsSection contracts={contracts} isLoading={contractsLoading} />

          <DisclosureFinancialStatement
            incomeBySource={incomeBySource}
            expensesByType={expensesByTypeExcludingVat}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            waqfCorpusPrevious={waqfCorpusPrevious}
            grandTotal={grandTotal}
            netAfterExpenses={netAfterExpenses}
            vatAmount={vatAmount}
            netAfterVat={netAfterVat}
            zakatAmount={zakatAmount}
            netAfterZakat={netAfterZakat}
            adminShare={adminShare}
            waqifShare={waqifShare}
            adminPct={adminPct}
            waqifPct={waqifPct}
            waqfCorpusManual={waqfCorpusManual}
            beneficiariesShare={beneficiariesShare}
            myShare={myShare}
            currentBeneficiaryName={currentBeneficiary?.name || ''}
            currentBeneficiaryPct={currentBeneficiary?.share_percentage ?? 0}
          />
        </div>
      </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default DisclosurePage;
