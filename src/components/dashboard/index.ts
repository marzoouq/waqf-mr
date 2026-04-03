/**
 * تصدير مكونات لوحة التحكم
 */
// مكونات مُستخدمة مباشرة (غير lazy)
export { default as CollectionSummaryCard } from './CollectionSummaryCard';
export { default as CollectionSummaryChart } from './CollectionSummaryChart';
export { default as DashboardAlerts } from './DashboardAlerts';
export { default as DashboardKpiPanel } from './DashboardKpiPanel';
export { default as DashboardStatsGrid } from './DashboardStatsGrid';
export { default as FiscalYearWidget } from './FiscalYearWidget';
export { default as IncomeMonthlyChart } from './IncomeMonthlyChart';
export { default as IncomeMonthlyChartInner } from './IncomeMonthlyChartInner';
export { default as QuickActionsCard } from './QuickActionsCard';
export { default as RecentContractsCard } from './RecentContractsCard';
export { default as YearComparisonCard } from './YearComparisonCard';
export { default as YoYBadge } from './YoYBadge';
// ملاحظة: DashboardCharts, DashboardChartsInner, CollectionHeatmap,
// PendingActionsTable, PagePerformanceCard مُستبعدة عمداً — تُحمّل عبر lazy() فقط
export type { StatItem } from './DashboardStatsGrid';
export type { KpiItem } from './DashboardKpiPanel';
