/**
 * useAdminDashboardPage — Page Hook موحّد للوحة الناظر/المحاسب (A2)
 *
 * يُجمّع تنسيق الهوكات الأربعة (`useDashboardSummary`, `useDashboardSecondary`,
 * `useAdminDashboardData`, `useAccountantDashboardData`) في كائن واحد
 * يستهلكه `AdminDashboard.tsx` كـ UI خالص.
 *
 * التزاماً بـ v7: الصفحة لا تنسّق هوكات متعددة بنفسها — هذا منطق صفحة.
 */
import { usePrint } from '@/hooks/ui/usePrint';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useDashboardSummary, useDashboardSecondary } from '@/hooks/data/financial/dashboard/useDashboardSummary';
import { useAdminDashboardData } from '@/hooks/page/admin/dashboard/useAdminDashboardData';
import { useAccountantDashboardData } from '@/hooks/page/admin/dashboard/useAccountantDashboardData';
import { dashboardKeys } from '@/lib/queryKeys/dashboardKeys';
import type { HeatmapInvoice } from '@/hooks/data/financial/dashboard/useDashboardSummary';

const EMPTY_HEATMAP: HeatmapInvoice[] = [];

export const useAdminDashboardPage = () => {
  const { role, user } = useAuth();
  const { fiscalYearId, fiscalYear, isSpecificYear } = useFiscalYear();
  const print = usePrint();

  // D-02: قناة مالية تبطل dashboard-summary (يشمل app_settings — تعديل الإعدادات يُحدّث النسب فورًا)
  useDashboardRealtime(
    'admin-dashboard-financial-realtime',
    ['income', 'expenses', 'accounts', 'payment_invoices',
     'properties', 'contracts', 'beneficiaries', 'distributions', 'advance_requests',
     'app_settings'],
    true,
    [
      // prefix-match — invalidateQueries({queryKey, exact:false}) يطابق كل المفاتيح التي تبدأ بهذا الـ prefix
      dashboardKeys.prefixes.summary,
      dashboardKeys.prefixes.heatmap,
      dashboardKeys.prefixes.recentContracts,
    ]
  );

  // D-03: قناة messages مستقلة — لا تبطل dashboard-summary، فقط عداد الرسائل غير المقروءة
  useDashboardRealtime(
    'admin-dashboard-messages-realtime',
    ['messages'],
    true,
    [['unread-messages-count']]
  );

  const summary = useDashboardSummary(fiscalYearId, fiscalYear?.label);
  const isLoading = summary.isLoading;

  // D-05: هوك ثانوي يُفعَّل فقط إذا اكتمل summary بنجاح (لا بعد فشل)
  const secondary = useDashboardSecondary(
    fiscalYearId,
    !summary.isLoading && !summary.isError
  );

  const adminData = useAdminDashboardData({
    user,
    role,
    fiscalYearId,
    fiscalYear: fiscalYear ?? undefined,
    isSpecificYear,
    summary,
  });

  // هوك بيانات المحاسب المخصصة — يُمرَّر بيانات فارغة للأدوار الأخرى لتفادي المعالجة الزائدة
  const isAccountant = role === 'accountant';
  const accountantMetrics = useAccountantDashboardData({
    aggregated: isAccountant ? summary.aggregated : null,
    heatmapInvoices: isAccountant ? secondary.heatmapInvoices : EMPTY_HEATMAP,
  });

  return {
    // identity / context
    role,
    fiscalYear,
    fiscalYearId,
    print,

    // loading flags
    isLoading,
    isError: adminData.isError,
    secondaryIsLoading: secondary.isLoading,

    // pending advances
    pendingAdvances: summary.pendingAdvances,
    heatmapInvoices: secondary.heatmapInvoices,
    recentContracts: secondary.recentContracts,
    // P0-2: حدود الـ heatmap مع fallback عند 'all' أو غياب السنة — يُحسب من invoices
    heatmapBounds: (() => {
      const fy = adminData.fiscalYear;
      if (fy?.start_date && fy?.end_date) return { start: fy.start_date, end: fy.end_date };
      const invs = secondary.heatmapInvoices;
      if (!invs.length) return { start: undefined, end: undefined };
      const dates = invs.map(i => i.due_date).filter(Boolean).sort();
      return { start: dates[0], end: dates[dates.length - 1] };
    })(),
    // surface secondary errors لاستخدامها في الكروت
    isRecentContractsError: secondary.isRecentContractsError,
    isHeatmapError: secondary.isHeatmapError,

    // admin data (spread)
    pendingAdvancesCount: adminData.pendingAdvancesCount,
    totalIncome: adminData.totalIncome,
    contractualRevenue: adminData.contractualRevenue,
    usingFallbackPct: adminData.usingFallbackPct,
    expiringContractsCount: adminData.expiringContractsCount,
    orphanedContractsCount: adminData.orphanedContractsCount,
    expenseRatio: adminData.expenseRatio,
    stats: adminData.stats,
    kpis: adminData.kpis,
    collectionSummary: adminData.collectionSummary,
    collectionColor: adminData.collectionColor,
    monthlyData: adminData.monthlyData,
    expenseTypes: adminData.expenseTypes,
    greetingText: adminData.greetingText,
    allFiscalYears: adminData.allFiscalYears,
    fy: adminData.fiscalYear,

    // accountant
    isAccountant,
    accountantMetrics,

    // D-07: علم عرض البطاقة منقول من JSX إلى hook
    showPerformanceCard: role === 'admin',
  };
};

export type AdminDashboardPageCtx = ReturnType<typeof useAdminDashboardPage>;
