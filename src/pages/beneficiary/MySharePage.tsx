/**
 * صفحة حصتي من الريع — مُفكّكة إلى hook + مكونات فرعية
 */
import { Wallet, AlertCircle, RefreshCw, UserX, FileDown, Info, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { RequirePublishedYears, ExportMenu, DashboardSkeleton } from '@/components/common';
import { AdvanceRequestDialog } from '@/components/beneficiaries';
import MyShareSummaryCards from '@/components/my-share/MyShareSummaryCards';
import DistributionsTable from '@/components/my-share/DistributionsTable';
import AdvancesTable from '@/components/my-share/AdvancesTable';
import CarryforwardsTable from '@/components/my-share/CarryforwardsTable';
import { useMySharePage } from '@/hooks/page/beneficiary/useMySharePage';
import { fmt } from '@/utils/format/format';

const MySharePage = () => {
  const {
    isLoading, isError, handleRetry,
    currentBeneficiary, isAccountMissing, isClosed,
    myShare, totalReceived, pendingAmount, paidAdvancesTotal, carryforwardBalance,
    filteredDistributions, myAdvances, myCarryforwards,
    advancesEnabled, advanceSettings, fiscalYearId, selectedFY,
    // isPdfLoading متاح في hook لكن لا يُستخدم مباشرة هنا
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

  // مستفيد غير موجود
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

  // حساب ختامي مفقود في سنة مقفلة
  if (isAccountMissing && isClosed) {
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
