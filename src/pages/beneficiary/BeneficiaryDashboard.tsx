import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout';
import { NoPublishedYearsNotice, DashboardSkeleton, DeferredRender } from '@/components/common';
import { isFyReady } from '@/constants/fiscalYearIds';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { makeWidgetDefaults } from '@/constants/beneficiaryWidgets';

import BeneficiaryWelcomeCard from '@/components/beneficiary-dashboard/BeneficiaryWelcomeCard';
import BeneficiaryStatsRow from '@/components/beneficiary-dashboard/BeneficiaryStatsRow';
import BeneficiaryQuickLinks from '@/components/beneficiary-dashboard/BeneficiaryQuickLinks';
import BeneficiaryRecentDistributions from '@/components/beneficiary-dashboard/BeneficiaryRecentDistributions';
import BeneficiaryNotificationsCard from '@/components/beneficiary-dashboard/BeneficiaryNotificationsCard';
import BeneficiaryAdvanceCard from '@/components/beneficiary-dashboard/BeneficiaryAdvanceCard';
import { useBeneficiaryDashboardPage } from '@/hooks/page/beneficiary';

const defaultWidgets = makeWidgetDefaults();

const BeneficiaryDashboard = () => {
  const {
    isLoading, dashError, dashLoading, noPublishedYears,
    currentBeneficiary, myShare, distributions, role, fiscalYearId,
    fiscalYear, isClosed, fyProgress,
    displayName, roleLabel, recentNotifications, unreadCount,
    advanceEnabled, pendingAdvanceCount, advanceSettings,
    handleRetry,
  } = useBeneficiaryDashboardPage();

  // ── Guards ──
  if (isLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (dashError) {
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

  if (!currentBeneficiary && !dashLoading) {
    return (
      <DashboardLayout>
        <div className="p-3 sm:p-6 space-y-4">
          <Card className="shadow-sm border-warning/30 bg-warning/5">
            <CardContent className="p-6 flex flex-col items-center justify-center gap-3 min-h-[30vh]">
              <AlertCircle className="w-12 h-12 text-warning" />
              <h2 className="text-lg font-bold text-foreground">حسابك غير مرتبط</h2>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                حسابك لم يُربط بسجل مستفيد بعد. يرجى التواصل مع الناظر لربط حسابك.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (noPublishedYears) {
    const hour = new Date().getHours();
    const GreetingIcon = hour < 12 ? Sun : Moon;
    const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';
    return (
      <DashboardLayout>
        <div className="p-3 sm:p-6 space-y-4">
          <Card className="overflow-hidden border-0 shadow-lg gradient-primary text-primary-foreground">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                  <GreetingIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-primary-foreground/80">{greeting}</p>
                  <h1 className="text-xl sm:text-2xl font-bold font-display">{displayName}</h1>
                </div>
              </div>
            </CardContent>
          </Card>
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <BeneficiaryWelcomeCard displayName={displayName} roleLabel={roleLabel} />

        <BeneficiaryStatsRow
          myShare={myShare}
          isClosed={isClosed}
          distributions={distributions}
          fiscalYearLabel={fiscalYear?.label || ''}
          fyProgress={fyProgress}
        />

        {/* تنبيه السنة غير المقفلة */}
        {fiscalYear && !isClosed && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/30 bg-warning/5 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-warning shrink-0" />
            <span>الأرقام النهائية (حصص الريع والتوزيعات) ستتوفر بعد إقفال السنة المالية.</span>
          </div>
        )}

        {/* بطاقة طلب السُلفة */}
        {advanceEnabled && role !== 'waqif' && currentBeneficiary && isFyReady(fiscalYearId) && (
          <DeferredRender delay={300}>
            <BeneficiaryAdvanceCard
              beneficiaryId={currentBeneficiary.id!}
              fiscalYearId={fiscalYearId}
              myShare={myShare}
              isClosed={isClosed}
              pendingAdvanceCount={pendingAdvanceCount}
              minAmount={advanceSettings?.min_amount ?? 500}
              maxPercentage={advanceSettings?.max_percentage ?? 50}
            />
          </DeferredRender>
        )}

        <BeneficiaryQuickLinks role={role} />

        <DeferredRender delay={500}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BeneficiaryRecentDistributions distributions={distributions} />
            <BeneficiaryNotificationsCard notifications={recentNotifications} unreadCount={unreadCount} />
          </div>
        </DeferredRender>
      </div>
    </DashboardLayout>
  );
};

export default BeneficiaryDashboard;
