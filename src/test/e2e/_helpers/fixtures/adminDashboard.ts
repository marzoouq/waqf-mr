/**
 * Fixtures لـ useAdminDashboardPage / useAggregatedAnnualReport
 * قيم ثابتة تمثّل سنة نشطة 2024-2025 — تُستهلك في E2E لإثبات العرض الكامل.
 */
import type { AdminDashboardPageCtx } from '@/hooks/page/admin/dashboard/useAdminDashboardPage';

export const adminDashboardFixture: AdminDashboardPageCtx = {
  role: 'admin',
  fiscalYear: {
    id: 'fy-active',
    label: '2024-2025',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    published: true,
  } as never,
  fiscalYearId: 'fy-active',
  print: () => {},

  isLoading: false,
  isError: false,
  secondaryIsLoading: false,

  pendingAdvances: [],
  heatmapInvoices: [],
  recentContracts: [],
  heatmapBounds: { start: '2024-01-01', end: '2024-12-31' },
  isRecentContractsError: false,
  isHeatmapError: false,

  pendingAdvancesCount: 0,
  totalIncome: 1_500_000,
  contractualRevenue: 1_800_000,
  usingFallbackPct: false,
  expiringContractsCount: 2,
  orphanedContractsCount: 0,
  expenseRatio: 0.25,
  stats: [],
  kpis: [],
  collectionSummary: {
    paid_count: 10,
    partial_count: 2,
    unpaid_count: 1,
    overdue_count: 0,
    total: 13,
    percentage: 76.9,
    total_collected: 1_200_000,
    total_expected: 1_500_000,
  } as never,
  collectionColor: 'success' as never,
  monthlyData: [],
  expenseTypes: [],
  greetingText: 'مرحباً بك أيها الناظر',
  allFiscalYears: [],
  fy: null,

  isAccountant: false,
  accountantMetrics: {} as never,
  accountantAggregated: null,

  showPerformanceCard: true,
};

export const aggregatedAnnualReportFixture = {
  handleExport: () => {},
  canExport: true,
  isExporting: false,
};
