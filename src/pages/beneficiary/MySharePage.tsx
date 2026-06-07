/**
 * صفحة حصتي من الريع — مُفكّكة إلى hook + مكونات فرعية
 */
import { useNavigate } from 'react-router-dom';
import { Wallet, AlertCircle, FileDown, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { RequirePublishedYears, ExportMenu, DashboardSkeleton, ErrorState, FiscalYearStateNotice } from '@/components/common';
import UnlinkedAccountNotice from '@/components/beneficiary/UnlinkedAccountNotice';
import AdvanceRequestDialog from '@/components/beneficiary/my-share/AdvanceRequestDialog';
import MyShareSummaryCards from '@/components/beneficiary/my-share/MyShareSummaryCards';
import DistributionsTable from '@/components/beneficiary/my-share/DistributionsTable';
import AdvancesTable from '@/components/beneficiary/my-share/AdvancesTable';
import CarryforwardsTable from '@/components/beneficiary/my-share/CarryforwardsTable';
import DeductionsExplanationCard from '@/components/beneficiary/my-share/DeductionsExplanationCard';
import { useMySharePage } from '@/hooks/page/beneficiary';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { fmt } from '@/utils/format/format';
import { PAGE_RESPONSIBILITY_COPY, MISSING_STATES_COPY } from '@/constants/beneficiaryCopy';

const MySharePage = () => {
  const { noPublishedYears } = useFiscalYear();
  const {
    isLoading, isError, handleRetry,
    currentBeneficiary, isAccountMissing, isClosed,
    myShare, totalReceived, pendingAmount, paidAdvancesTotal, carryforwardBalance,
    filteredDistributions, myAdvances, myCarryforwards,
    advancesEnabled, advanceSettings, fiscalYearId, selectedFY,
    handleDownloadPDF, handleDownloadDistributionsPDF, handleDownloadComprehensivePDF, handlePrintReport,
  } = useMySharePage();
  const navigate = useNavigate();

  // B2: حارس السنوات المنشورة قبل أي فرع — يمنع UnlinkedAccountNotice الخاطئة عند noPublishedYears
  if (noPublishedYears) {
    return <RequirePublishedYears title="حصتي من الريع" icon={Wallet} description="تفاصيل حصتك من ريع الوقف"><></></RequirePublishedYears>;
  }

  // حالة التحميل
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6"><DashboardSkeleton /></div>
      </DashboardLayout>
    );
  }

  // حالة الخطأ
  if (isError) {
    return <ErrorState onRetry={handleRetry} />;
  }

  // مستفيد غير موجود
  if (!currentBeneficiary) {
    return <UnlinkedAccountNotice />;
  }

  // حساب ختامي مفقود في سنة مقفلة
  if (isAccountMissing && isClosed) {
    return (
      <ErrorState
        variant="warning"
        message="لم يتم العثور على الحساب الختامي"
        description="لا يوجد حساب ختامي مسجل لهذه السنة المالية بعد. يرجى التواصل مع ناظر الوقف أو المحاولة لاحقاً."
        onRetry={handleRetry}
        retryLabel="إعادة تحميل"
      />
    );
  }

  return (
    <RequirePublishedYears title="حصتي من الريع" icon={Wallet} description="تفاصيل حصتك من ريع الوقف">
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
                    beneficiaryId={currentBeneficiary.id || ''}
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
                  onExportPdf={isClosed ? handleDownloadPDF : undefined}
                  extraItems={isClosed ? [
                    { label: 'تقرير التوزيع', icon: FileDown, onClick: handleDownloadDistributionsPDF },
                    { label: 'تقرير شامل', icon: FileDown, onClick: handleDownloadComprehensivePDF },
                  ] : undefined}
                />
              </div>
            }
          />

          {/* CR-01: تنبيه حالة السنة النشطة (يستبدل badge القديم + بطاقة "لم تُغلق") */}
          {!isClosed && (
            <FiscalYearStateNotice state="active" />
          )}

          {/* U3: مرجعية الصفحة */}
          <p className="text-xs text-muted-foreground">{PAGE_RESPONSIBILITY_COPY.myShare}</p>

          {/* بطاقات الملخص */}
          <MyShareSummaryCards
            sharePercentage={currentBeneficiary.share_percentage ?? 0}
            myShare={myShare}
            totalReceived={totalReceived}
            pendingAmount={pendingAmount}
            paidAdvancesTotal={paidAdvancesTotal}
            isClosed={isClosed}
            advancesEnabled={advancesEnabled}
          />

          {/* بطاقة تفسير الخصومات (عند وجود سُلف أو فروق في سنة مقفلة) */}
          <DeductionsExplanationCard
            myShare={myShare}
            paidAdvancesTotal={paidAdvancesTotal}
            carryforwardBalance={carryforwardBalance}
            isClosed={isClosed}
          />

          {/* MS-06: سنة مغلقة بدون توزيعات */}
          {isClosed && filteredDistributions.length === 0 && (
            <Card className="shadow-sm border-info/30 bg-info/5">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{MISSING_STATES_COPY.closedNoDistributionYet}</p>
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

          {/* رابط الإفصاح */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  لمعرفة تفاصيل احتساب الحصة والتسلسل المالي الكامل
                </p>
                <Button variant="link" className="text-primary gap-1" onClick={() => navigate('/beneficiary/disclosure')}>
                  <FileText className="w-4 h-4" />
                  صفحة الإفصاح السنوي
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* سجل التوزيعات */}
          <DistributionsTable distributions={filteredDistributions} />

          {/* سجل السُلف */}
          {advancesEnabled && <AdvancesTable advances={myAdvances} />}

          {/* الفروق المرحّلة */}
          <CarryforwardsTable carryforwards={myCarryforwards} />
        </div>
      </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default MySharePage;
