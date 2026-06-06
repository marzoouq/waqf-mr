import { Button } from '@/components/ui/button';
import { FileText, FileDown } from 'lucide-react';
import { ExportMenu, RequirePublishedYears, DashboardSkeleton, ErrorState, FiscalYearStateNotice } from '@/components/common';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import DisclosureSummaryCards from '@/components/beneficiary/disclosure/DisclosureSummaryCards';
import DisclosureContractsSection from '@/components/beneficiary/disclosure/DisclosureContractsSection';
import DisclosureFinancialStatement from '@/components/beneficiary/disclosure/DisclosureFinancialStatement';
import UnlinkedAccountNotice from '@/components/beneficiary/UnlinkedAccountNotice';
import { useDisclosurePage } from '@/hooks/page/beneficiary';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { PAGE_RESPONSIBILITY_COPY } from '@/constants/beneficiaryCopy';

const DisclosurePage = () => {
  const { noPublishedYears } = useFiscalYear();
  const {
    isLoading, isError, isAccountMissing,
    selectedFY, handleRetry,
    totalIncome, totalExpenses, vatAmount, zakatAmount, waqfCorpusManual,
    waqfCorpusPrevious, grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, adminPct, waqifPct, beneficiariesShare,
    incomeBySource, expensesByTypeExcludingVat,
    currentBeneficiary, myShare, totalReceived, pendingAmount, gregorianFiscalYear,
    contracts,
    handleDownloadPDF, handleDownloadComprehensivePDF,
  } = useDisclosurePage();

  // B2: حارس السنوات المنشورة قبل أي فرع
  if (noPublishedYears) {
    return <RequirePublishedYears title="الإفصاح السنوي" icon={FileText}><></></RequirePublishedYears>;
  }

  if (isLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (isError) {
    return (
      <ErrorState
        onRetry={handleRetry}
        description="يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى."
      />
    );
  }

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
            totalReceived={totalReceived}
            pendingAmount={pendingAmount}
            waqfCorpusPrevious={waqfCorpusPrevious}
            isClosed={selectedFY?.status === 'closed'}
          />

          {/* U3: مرجعية الصفحة */}
          <p className="text-xs text-muted-foreground">{PAGE_RESPONSIBILITY_COPY.disclosure}</p>

          {/* CR-01: تنبيه حالة السنة */}
          {selectedFY?.status === 'closed' ? (
            <FiscalYearStateNotice state="closed" />
          ) : (
            <FiscalYearStateNotice state="active" />
          )}

          <DisclosureContractsSection contracts={contracts} isLoading={isLoading} />

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
            totalReceived={totalReceived}
            pendingAmount={pendingAmount}
            currentBeneficiaryName={currentBeneficiary?.name || ''}
            currentBeneficiaryPct={currentBeneficiary?.share_percentage ?? 0}
          />
        </div>
      </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default DisclosurePage;
