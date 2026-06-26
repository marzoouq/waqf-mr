import { Card, CardContent } from '@/components/ui/card';
import { Sun, Moon } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { NoPublishedYearsNotice, DashboardSkeleton, DeferredRender, ErrorState, FiscalYearStateNotice } from '@/components/common';
import { isFyReady } from '@/constants/fiscalYearIds';

import { PAGE_RESPONSIBILITY_COPY } from '@/constants/beneficiaryCopy';

import BeneficiaryWelcomeCard from '@/components/beneficiary/dashboard/BeneficiaryWelcomeCard';
import UnlinkedAccountNotice from '@/components/beneficiary/UnlinkedAccountNotice';
import BeneficiaryStatsRow from '@/components/beneficiary/dashboard/BeneficiaryStatsRow';
import BeneficiaryQuickLinks from '@/components/beneficiary/dashboard/BeneficiaryQuickLinks';
import BeneficiaryRecentDistributions from '@/components/beneficiary/dashboard/BeneficiaryRecentDistributions';
import BeneficiaryNotificationsCard from '@/components/beneficiary/dashboard/BeneficiaryNotificationsCard';
import BeneficiaryAdvanceCard from '@/components/beneficiary/dashboard/BeneficiaryAdvanceCard';
import { useBeneficiaryDashboardPage } from '@/hooks/page/beneficiary';

const BeneficiaryDashboard = () => {
  const {
    isLoading, dashError, dashLoading, noPublishedYears, fyReady, isVisible,
    currentBeneficiary, myShare, distributions, role, fiscalYearId, myShareTrend,
    fiscalYear, isClosed, fyProgress,
    displayName, roleLabel, recentNotifications, unreadCount, greetingData,
    advanceEnabled, pendingAdvanceCount, advanceContext,
    handleRetry,
  } = useBeneficiaryDashboardPage();

  // ── Guards ──
  if (isLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (dashError) {
    return <ErrorState onRetry={handleRetry} />;
  }

  // H2: لا تُظهر "غير مرتبط" حتى تكون السنة جاهزة فعلاً
  if (fyReady && !currentBeneficiary && !dashLoading) {
    return <UnlinkedAccountNotice />;
  }



  if (noPublishedYears) {
    const GreetingIcon = greetingData.greetingIconName === 'sun' ? Sun : Moon;
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
                  <p className="text-sm text-primary-foreground/80">{greetingData.greeting}</p>
                  <h1 className="text-display-md font-display">{displayName}</h1>
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
        {isVisible('welcome_card') && (
          <BeneficiaryWelcomeCard displayName={displayName} roleLabel={roleLabel} greetingData={greetingData} />
        )}

        {isVisible('stats_row') && (
          <BeneficiaryStatsRow
            myShare={myShare}
            isClosed={isClosed}
            distributions={distributions}
            fiscalYearLabel={fiscalYear?.label || ''}
            fyProgress={fyProgress}
            myShareTrend={myShareTrend}
          />
        )}

        {/* CR-01: تنبيه حالة السنة (موحَّد) */}
        {isVisible('fiscal_year_notice') && fiscalYear && !isClosed && (
          <FiscalYearStateNotice state={fyProgress.notStarted ? 'notStarted' : 'active'} />
        )}

        {/* U3: مرجعية الصفحة */}
        <p className="text-xs text-muted-foreground px-1">{PAGE_RESPONSIBILITY_COPY.dashboard}</p>

        {/* بطاقة طلب السُلفة — CR-07: تنقل إلى MyShare */}
        {isVisible('advance_card') && advanceEnabled && role !== 'waqif' && currentBeneficiary && isFyReady(fiscalYearId) && (
          <DeferredRender delay={300}>
            <BeneficiaryAdvanceCard pendingAdvanceCount={pendingAdvanceCount} advanceContext={advanceContext} />
          </DeferredRender>
        )}

        {isVisible('quick_links') && (
          <BeneficiaryQuickLinks role={role} />
        )}

        <DeferredRender delay={500}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {isVisible('recent_distributions') && (
              <BeneficiaryRecentDistributions distributions={distributions} />
            )}
            {isVisible('notifications_card') && (
              <BeneficiaryNotificationsCard notifications={recentNotifications} unreadCount={unreadCount} />
            )}
          </div>
        </DeferredRender>
      </div>
    </DashboardLayout>
  );
};

export default BeneficiaryDashboard;
