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
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useDashboardSummary, useDashboardSecondary } from '@/hooks/data/financial/useDashboardSummary';
import { useAdminDashboardData } from '@/hooks/page/admin/dashboard/useAdminDashboardData';
import { useAccountantDashboardData } from '@/hooks/page/admin/dashboard/useAccountantDashboardData';

export const useAdminDashboardPage = () => {
  const { role, user } = useAuth();
  const { fiscalYearId, fiscalYear, isSpecificYear } = useFiscalYear();
  const print = usePrint();

  useDashboardRealtime(
    'admin-dashboard-realtime',
    ['income', 'expenses', 'accounts', 'payment_invoices', 'messages'],
    true,
    [
      ['dashboard-summary'],
      ['dashboard-heatmap'],
      ['dashboard-recent-contracts'],
      ['unread-messages-count'],
    ]
  );

  const summary = useDashboardSummary(fiscalYearId, fiscalYear?.label);
  const isLoading = summary.isLoading;

  // هوك ثانوي — يجلب heatmap و recent_contracts بعد تحميل KPIs
  const secondary = useDashboardSecondary(fiscalYearId, !summary.isLoading);

  const adminData = useAdminDashboardData({
    user,
    role,
    fiscalYearId,
    fiscalYear: fiscalYear ?? undefined,
    isSpecificYear,
    summary,
  });

  // هوك بيانات المحاسب المخصصة
  const isAccountant = role === 'accountant';
  const accountantMetrics = useAccountantDashboardData({
    aggregated: summary.aggregated,
    heatmapInvoices: secondary.heatmapInvoices,
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
  };
};

export type AdminDashboardPageCtx = ReturnType<typeof useAdminDashboardPage>;
