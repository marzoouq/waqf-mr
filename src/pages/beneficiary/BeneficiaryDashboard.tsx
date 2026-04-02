import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBfcacheSafeChannel } from '@/hooks/ui/useBfcacheSafeChannel';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useNotifications } from '@/hooks/data/useNotifications';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { AlertCircle, RefreshCw, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/DashboardLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';
import { useBeneficiaryDashboardData } from '@/hooks/page/useBeneficiaryDashboardData';

import BeneficiaryWelcomeCard from '@/components/beneficiary-dashboard/BeneficiaryWelcomeCard';
import BeneficiaryStatsRow from '@/components/beneficiary-dashboard/BeneficiaryStatsRow';
import BeneficiaryQuickLinks from '@/components/beneficiary-dashboard/BeneficiaryQuickLinks';
import BeneficiaryRecentDistributions from '@/components/beneficiary-dashboard/BeneficiaryRecentDistributions';
import BeneficiaryNotificationsCard from '@/components/beneficiary-dashboard/BeneficiaryNotificationsCard';
import BeneficiaryAdvanceCard from '@/components/beneficiary-dashboard/BeneficiaryAdvanceCard';

const BeneficiaryDashboard = () => {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['beneficiary-dashboard'] });
  }, [queryClient]);

  const { role, loading: authLoading } = useAuth();
  const { filteredData: notifications = [], filteredUnreadCount: unreadCount } = useNotifications();
  const { fiscalYear, fiscalYearId, isLoading: fyLoading, noPublishedYears } = useFiscalYear();

  // ── RPC الموحد — يجلب كل البيانات في استدعاء واحد ──
  const { data: dashData, isLoading: dashLoading, isError: dashError } = useBeneficiaryDashboardData(
    fiscalYearId !== '__none__' ? fiscalYearId : undefined,
  );

  // استخراج البيانات من RPC
  const currentBeneficiary = dashData?.beneficiary ?? null;
  const myShare = dashData?.my_share ?? 0;
  const distributions = dashData?.recent_distributions ?? [];
  const pendingAdvanceCount = dashData?.pending_advance_count ?? 0;
  const advanceSettings = dashData?.advance_settings ?? { enabled: true, min_amount: 500, max_percentage: 50 };
  const advanceEnabled = advanceSettings?.enabled ?? true;

  const fyReady = fiscalYearId && fiscalYearId !== '__none__';
  const isLoading = authLoading || fyLoading || (!fyReady ? false : dashLoading);

  const isClosed = fiscalYear?.status === 'closed';
  const fyProgress = (() => {
    if (!fiscalYear) return { percent: 0, daysLeft: 0 };
    if (isClosed) return { percent: 100, daysLeft: 0 };
    const start = new Date(fiscalYear.start_date).getTime();
    const end = new Date(fiscalYear.end_date).getTime();
    const total = end - start;
    const elapsed = Date.now() - start;
    const percent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
    return { percent, daysLeft };
  })();

  const displayName = currentBeneficiary?.name || (role === 'admin' ? 'الناظر' : role === 'waqif' ? 'الواقف' : 'مستفيد');
  const roleLabel = role === 'admin' ? 'واجهة معاينة المستفيد' : 'واجهة المستفيد';

  // Realtime invalidation — bfcache safe
  const beneficiaryId = currentBeneficiary?.id ?? '';
  const qcRef = useRef(queryClient);
  qcRef.current = queryClient;

  const distSubscribeFn = useCallback((channel: import('@supabase/supabase-js').RealtimeChannel) => {
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'distributions',
      filter: `beneficiary_id=eq.${beneficiaryId}`,
    }, () => {
      qcRef.current.invalidateQueries({ queryKey: ['beneficiary-dashboard'] });
      qcRef.current.invalidateQueries({ queryKey: ['my-distributions'] });
    });
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'accounts',
    }, () => {
      qcRef.current.invalidateQueries({ queryKey: ['beneficiary-dashboard'] });
    });
  }, [beneficiaryId]);

  useBfcacheSafeChannel(
    `beneficiary-dist-${beneficiaryId}`,
    distSubscribeFn,
    !!currentBeneficiary?.id,
  );

  const recentNotifications = notifications.slice(0, 3);

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
        {advanceEnabled && role !== 'waqif' && currentBeneficiary && fiscalYearId && fiscalYearId !== '__none__' && (
          <BeneficiaryAdvanceCard
            beneficiaryId={currentBeneficiary.id!}
            fiscalYearId={fiscalYearId}
            myShare={myShare}
            isClosed={isClosed}
            pendingAdvanceCount={pendingAdvanceCount}
            minAmount={advanceSettings?.min_amount ?? 500}
            maxPercentage={advanceSettings?.max_percentage ?? 50}
          />
        )}

        <BeneficiaryQuickLinks role={role} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BeneficiaryRecentDistributions distributions={distributions} />
          <BeneficiaryNotificationsCard notifications={recentNotifications} unreadCount={unreadCount} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BeneficiaryDashboard;
