import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiariesSafe } from '@/hooks/useBeneficiaries';
import { useNotifications } from '@/hooks/useNotifications';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useMyShare } from '@/hooks/useMyShare';
import { Wallet, FileText, BarChart3, PieChart, BookOpen, Bell, ArrowLeft, Sun, Moon, Calendar, Clock, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';


const BeneficiaryDashboard = () => {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries(), [queryClient]);
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: beneficiaries = [], isLoading: benLoading, isError: benError } = useBeneficiariesSafe();
  const { data: notifications = [], isLoading: notifLoading } = useNotifications();
  const { fiscalYear, fiscalYearId, isLoading: fyLoading, noPublishedYears } = useFiscalYear();

  // Don't fetch financial data until fiscalYearId is valid
  const fyReady = fiscalYearId && fiscalYearId !== '__none__';
  const { availableAmount, isLoading: finLoading } = useFinancialSummary(
    fyReady ? fiscalYearId : undefined,
    fyReady ? fiscalYear?.label : undefined,
    { fiscalYearStatus: fiscalYear?.status },
  );

  const { data: totalBenPct = 0, isLoading: pctLoading } = useTotalBeneficiaryPercentage();

  // ── Derived financials (computed only when data is valid) ──
  const currentBeneficiary = useMemo(() => benError ? undefined : beneficiaries.find(b => b.user_id === user?.id), [beneficiaries, user?.id, benError]);
  const safeAvailable = safeNumber(availableAmount);
  const myShare = currentBeneficiary && totalBenPct > 0
    ? safeAvailable * (currentBeneficiary.share_percentage ?? 0) / totalBenPct
    : 0;

  // ── Include notifLoading to prevent FOUC ──
  const isLoading = authLoading || benLoading || fyLoading || notifLoading || pctLoading || (!fyReady ? false : finLoading);

  /* ── Live clock ── */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => { id = setInterval(() => setNow(new Date()), 60_000); };
    const stop = () => { if (id) { clearInterval(id); id = undefined; } };
    const onVisibility = () => { if (document.hidden) { stop(); } else { setNow(new Date()); start(); } };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const GreetingIcon = hour < 12 ? Sun : Moon;

  const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const gregorianDate = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  /* ── Fiscal year progress ── */
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

  /* ── Recent distributions via useQuery + Realtime ── */
  const { data: distributions = [] } = useQuery({
    queryKey: ['my-distributions-recent', currentBeneficiary?.id],
    enabled: !!currentBeneficiary?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distributions')
        .select('id, amount, date, status')
        .eq('beneficiary_id', currentBeneficiary!.id!)
        .order('date', { ascending: false })
        .limit(3);
      if (error) {
        logger.error('Failed to fetch distributions:', error.message);
        return [];
      }
      return data || [];
    },
  });

  // Realtime invalidation for distributions
  // Realtime invalidation for distributions (queryClient declared above)
  useEffect(() => {
    if (!currentBeneficiary?.id) return;

    const channel = supabase
      .channel(`beneficiary-distributions-${currentBeneficiary.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'distributions',
        filter: `beneficiary_id=eq.${currentBeneficiary.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['my-distributions-recent', currentBeneficiary.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBeneficiary?.id, queryClient]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const recentNotifications = notifications.slice(0, 3);

  const quickLinks = useMemo(() => [
    ...(role !== 'waqif' ? [
      { title: 'الإفصاح السنوي', description: 'البيان المالي التفصيلي', icon: FileText, path: '/beneficiary/disclosure', color: 'bg-primary/10 text-primary' },
      { title: 'حصتي من الريع', description: 'تفاصيل حصتك والتوزيعات', icon: PieChart, path: '/beneficiary/my-share', color: 'bg-accent/10 text-accent-foreground' },
    ] : []),
    { title: 'التقارير المالية', description: 'الرسوم البيانية والإحصائيات', icon: BarChart3, path: '/beneficiary/financial-reports', color: 'bg-muted text-muted-foreground' },
    { title: 'اللائحة التنظيمية', description: 'أحكام ولوائح الوقف', icon: BookOpen, path: '/beneficiary/bylaws', color: 'bg-secondary/10 text-secondary' },
  ], [role]);

  // ── Guards: loading first, then error, then noPublishedYears ──
  if (isLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (benError) {
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

  if (noPublishedYears) {
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
                  <h1 className="text-xl sm:text-2xl font-bold font-display">{currentBeneficiary?.name || (role === 'waqif' ? 'الواقف' : 'مستفيد')}</h1>
                </div>
              </div>
            </CardContent>
          </Card>
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  // H-1: guard — مستفيد بدون user_id مربوط
  if (!currentBeneficiary && !benLoading) {
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

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">

        {/* ═══ Welcome Card ═══ */}
        <Card className="overflow-hidden border-0 shadow-lg gradient-primary text-primary-foreground animate-slide-up">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <GreetingIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base text-primary-foreground/80">{greeting}</p>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">
                    {currentBeneficiary?.name || (role === 'waqif' ? 'الواقف' : 'مستفيد')}
                  </h1>
                  <p className="text-xs sm:text-sm text-primary-foreground/70 mt-0.5">واجهة المستفيد</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-primary-foreground/85 shrink-0">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{hijriDate}</span>
                <span className="hidden sm:inline text-primary-foreground/40">|</span>
                <span>{gregorianDate}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{timeStr}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Stats row ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* My share amount */}
          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">حصتي من الريع</p>
                  {!isClosed ? (
                    <p className="text-sm font-medium text-muted-foreground">تُحسب عند الإقفال</p>
                  ) : (
                    <p className="text-lg sm:text-xl font-bold truncate">{myShare.toLocaleString()} ر.س</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total received */}
          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-success/10 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">آخر توزيع مستلم</p>
                  {(() => {
                    const lastPaid = distributions.find(d => d.status === 'paid');
                    return lastPaid ? (
                      <p className="text-lg sm:text-xl font-bold truncate">
                        {Number(lastPaid.amount).toLocaleString()} ر.س
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">لا توجد توزيعات</p>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fiscal year progress */}
          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">السنة المالية</p>
                <Badge variant="outline" className="text-[10px]">{fiscalYear?.label || '—'}</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${fyProgress.percent}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                {isClosed ? 'مُقفلة' : `متبقي ${fyProgress.daysLeft} يوم`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Unclosed year notice ═══ */}
        {fiscalYear && !isClosed && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/30 bg-warning/5 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-warning shrink-0" />
            <span>الأرقام النهائية (حصص الريع والتوزيعات) ستتوفر بعد إقفال السنة المالية.</span>
          </div>
        )}

        {/* ═══ Quick Links ═══ */}
        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3">الوصول السريع</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickLinks.map((link) => (
              <Card key={link.path} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow group" onClick={() => navigate(link.path)}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${link.color}`}>
                      <link.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{link.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{link.description}</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ═══ Bottom grid: Distributions + Notifications ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent distributions */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wallet className="w-5 h-5" />
                آخر التوزيعات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {distributions.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">لا توجد توزيعات مسجلة</p>
              ) : (
                <div className="space-y-3">
                  {distributions.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{Number(d.amount).toLocaleString()} ر.س</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(d.date).toLocaleDateString('ar-SA')}</p>
                      </div>
                      <Badge variant={d.status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
                        {d.status === 'paid' ? 'مدفوع' : 'معلق'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bell className="w-5 h-5" />
                آخر الإشعارات
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5">{unreadCount}</Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/beneficiary/notifications')}>عرض الكل</Button>
            </CardHeader>
            <CardContent>
              {recentNotifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">لا توجد إشعارات جديدة</p>
              ) : (
                <div className="space-y-3">
                  {recentNotifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{n.title}</p>
                          {!n.is_read && <Badge variant="default" className="text-[10px] px-1.5 py-0">جديد</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{n.message}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BeneficiaryDashboard;
