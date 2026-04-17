/**
 * هوك لوحة تحكم المستفيد — يستخرج كل المنطق من BeneficiaryDashboard
 */
import { useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBfcacheSafeChannel } from '@/lib/realtime/bfcacheSafeChannel';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useNotifications } from '@/hooks/data/notifications/useNotifications';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useBeneficiaryDashboardData } from '@/hooks/page/beneficiary/useBeneficiaryDashboardData';
import { useRetryQueries } from '@/hooks/data/core/useRetryQueries';
import { useGreeting } from '@/hooks/ui/useGreeting';
import { isFyReady } from '@/constants/fiscalYearIds';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useBeneficiaryDashboardPage() {
  const queryClient = useQueryClient();
  const handleRetry = useRetryQueries(['beneficiary-dashboard']);

  const { user, role, loading: authLoading } = useAuth();
  const { filteredData: notifications = [], filteredUnreadCount: unreadCount } = useNotifications();
  const { fiscalYear, fiscalYearId, isLoading: fyLoading, noPublishedYears } = useFiscalYear();

  const { data: dashData, isLoading: dashLoading, isError: dashError } = useBeneficiaryDashboardData(
    isFyReady(fiscalYearId) ? fiscalYearId : undefined,
  );

  const currentBeneficiary = dashData?.beneficiary ?? null;
  const myShare = dashData?.my_share ?? 0;
  const distributions = dashData?.recent_distributions ?? [];
  const pendingAdvanceCount = dashData?.pending_advance_count ?? 0;
  const advanceSettings = dashData?.advance_settings ?? { enabled: true, min_amount: 500, max_percentage: 50 };
  const advanceEnabled = advanceSettings?.enabled ?? true;

  const fyReady = isFyReady(fiscalYearId);
  const isLoading = authLoading || fyLoading || (!fyReady ? false : dashLoading);

  const isClosed = fiscalYear?.status === 'closed';

  // #8 — useMemo بدل IIFE، #24 — إضافة isClosed للنتيجة
  const fyProgress = useMemo(() => {
    if (!fiscalYear) return { percent: 0, daysLeft: 0, isClosed: false, notStarted: false };
    if (isClosed) return { percent: 100, daysLeft: 0, isClosed: true, notStarted: false };
    const start = new Date(fiscalYear.start_date).getTime();
    const end = new Date(fiscalYear.end_date).getTime();
    const total = end - start;
    const elapsed = Date.now() - start;
    const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
    // #B6 — السنة المستقبلية
    if (Date.now() < start) return { percent: 0, daysLeft, isClosed: false, notStarted: true };
    const percent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    return { percent, daysLeft, isClosed: false, notStarted: false };
  }, [fiscalYear, isClosed]);

  // #22 — تحسين displayName بـ user metadata
  const displayName = currentBeneficiary?.name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || (role === 'admin' ? 'الناظر' : role === 'waqif' ? 'الواقف' : 'مستفيد');
  const roleLabel = role === 'admin' ? 'واجهة معاينة المستفيد' : 'واجهة المستفيد';

  // Realtime invalidation — bfcache safe
  const beneficiaryId = currentBeneficiary?.id ?? '';
  const qcRef = useRef(queryClient);
  qcRef.current = queryClient;

  const distSubscribeFn = useCallback((channel: RealtimeChannel) => {
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
    // #D1 — Realtime لـ advance_requests
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'advance_requests',
      filter: `beneficiary_id=eq.${beneficiaryId}`,
    }, () => {
      qcRef.current.invalidateQueries({ queryKey: ['beneficiary-dashboard'] });
    });
    // #D2 — Realtime لـ fiscal_years (كشف النشر)
    channel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'fiscal_years',
    }, () => {
      qcRef.current.invalidateQueries({ queryKey: ['beneficiary-dashboard'] });
    });
    // #D4 — Realtime لـ app_settings
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'app_settings',
    }, () => {
      qcRef.current.invalidateQueries({ queryKey: ['beneficiary-dashboard'] });
    });
  }, [beneficiaryId]);

  useBfcacheSafeChannel(
    `beneficiary-dist-${beneficiaryId || 'none'}`,
    distSubscribeFn,
    !!currentBeneficiary?.id,
  );

  const recentNotifications = notifications.slice(0, 3);
  const greetingData = useGreeting();

  return {
    // حالات التحميل والخطأ
    isLoading, dashError, dashLoading, noPublishedYears,
    // بيانات المستفيد
    currentBeneficiary, myShare, distributions, role, fiscalYearId,
    // بيانات السنة المالية
    fiscalYear, isClosed, fyProgress,
    // بيانات العرض
    displayName, roleLabel, recentNotifications, unreadCount, greetingData,
    // بيانات السُلفة
    advanceEnabled, pendingAdvanceCount, advanceSettings,
    // دوال الإجراءات
    handleRetry,
  };
}
