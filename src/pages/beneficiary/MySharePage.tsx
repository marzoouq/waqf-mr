/**
 * صفحة حصتي من الريع — مُفكّكة إلى hook + مكونات فرعية
 */
import { useNavigate } from 'react-router-dom';
import { Wallet, AlertCircle, UserX, FileDown, Info, FileText, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { RequirePublishedYears, ExportMenu, DashboardSkeleton, ErrorState, EmptyPageState } from '@/components/common';
import { AdvanceRequestDialog } from '@/components/beneficiary/admin';
import MyShareSummaryCards from '@/components/beneficiary/my-share/MyShareSummaryCards';
import DistributionsTable from '@/components/beneficiary/my-share/DistributionsTable';
import AdvancesTable from '@/components/beneficiary/my-share/AdvancesTable';
import CarryforwardsTable from '@/components/beneficiary/my-share/CarryforwardsTable';
import DeductionsExplanationCard from '@/components/beneficiary/my-share/DeductionsExplanationCard';
import { useMySharePage } from '@/hooks/page/beneficiary';
import { fmt } from '@/utils/format/format';

const MySharePage = () => {
  const {
    isLoading, isError, handleRetry,
    currentBeneficiary, isAccountMissing, isClosed,
    myShare, myShareIsEstimated, totalReceived, pendingAmount, paidAdvancesTotal, carryforwardBalance,
    filteredDistributions, myAdvances, myCarryforwards,
    advancesEnabled, advanceSettings, fiscalYearId, selectedFY,
    handleDownloadPDF, handleDownloadDistributionsPDF, handleDownloadComprehensivePDF, handlePrintReport,
  } = useMySharePage();
  const navigate = useNavigate();

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
    return (
      <EmptyPageState
        icon={UserX}
        title="لم يتم العثور على سجل المستفيد"
        description="حسابك غير مرتبط بسجل مستفيد. يرجى التواصل مع ناظر الوقف."
      />
    );
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

          {/* #C1 — badge تقديري */}
          {myShareIsEstimated && !isClosed && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning/10 border border-warning/30 text-warning text-sm w-fit">
              <Clock className="w-4 h-4" />
              <span className="font-medium">الحصة المعروضة تقديرية — ستتأكد بعد إقفال السنة</span>
            </div>
          )}

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

          {/* تنبيه السنة النشطة */}
          {!isClosed && (
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
