import { Button } from '@/components/ui/button';
import { FileText, FileDown } from 'lucide-react';
import { ExportMenu, RequirePublishedYears, DashboardSkeleton, ErrorState, FiscalYearStateNotice } from '@/components/common';
import { DashboardLayout, PageHero } from '@/components/layout';
import DisclosureSummaryCards from '@/components/beneficiary/disclosure/DisclosureSummaryCards';
import DisclosureContractsSection from '@/components/beneficiary/disclosure/DisclosureContractsSection';
import DisclosureFinancialStatement from '@/components/beneficiary/disclosure/DisclosureFinancialStatement';
import UnlinkedAccountNotice from '@/components/beneficiary/UnlinkedAccountNotice';
import { useDisclosurePage } from '@/hooks/page/beneficiary';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { PAGE_RESPONSIBILITY_COPY } from '@/constants/beneficiaryCopy';

const SECTIONS = [
  { id: 'disclosure-summary', label: 'الملخص' },
  { id: 'disclosure-contracts', label: 'ملخص العقود' },
  { id: 'disclosure-statement', label: 'البيان المالي التفصيلي' },
] as const;

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
    contractsSummary,
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
        <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-5 sm:space-y-6">
          <PageHero
            title="الإفصاح السنوي"
            eyebrow={selectedFY?.status === 'closed' ? 'سنة مقفلة — أرقام نهائية معتمدة' : 'سنة نشطة — أرقام تقديرية'}
            description={`السنة المالية: ${gregorianFiscalYear}`}
            icon={FileText}
            actions={
              <>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadComprehensivePDF}>
                  <FileDown className="w-4 h-4" />تقرير شامل
                </Button>
                <ExportMenu onExportPdf={handleDownloadPDF} />
              </>
            }
          >
            <nav aria-label="أقسام الإفصاح" className="flex flex-wrap gap-2 print:hidden">
              {SECTIONS.map(sec => (
                <a key={sec.id} href={`#${sec.id}`} className="rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-primary-foreground/20">
                  {sec.label}
                </a>
              ))}
            </nav>
          </PageHero>

          <div id="disclosure-summary" className="scroll-mt-24">
          <DisclosureSummaryCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            vatAmount={vatAmount}
            myShare={myShare}
            totalReceived={totalReceived}
            pendingAmount={pendingAmount}
            waqfCorpusPrevious={waqfCorpusPrevious}
            isClosed={selectedFY?.status === 'closed'}
          />
          </div>

          {/* U3: مرجعية الصفحة */}
          <p className="text-xs text-muted-foreground">{PAGE_RESPONSIBILITY_COPY.disclosure}</p>

          {/* CR-01: تنبيه حالة السنة */}
          {selectedFY?.status === 'closed' ? (
            <FiscalYearStateNotice state="closed" />
          ) : (
            <FiscalYearStateNotice state="active" />
          )}

          <div id="disclosure-contracts" className="scroll-mt-24">
            <DisclosureContractsSection summary={contractsSummary} isLoading={isLoading} />
          </div>

          <div id="disclosure-statement" className="scroll-mt-24">

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
            isClosed={selectedFY?.status === 'closed'}
          />
          </div>
        </div>
      </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default DisclosurePage;
