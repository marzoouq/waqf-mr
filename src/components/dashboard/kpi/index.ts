/**
 * Sub-barrel: KPI cards & summary widgets (موجة 16)
 */
export { default as DashboardKpiPanel } from './DashboardKpiPanel';
export type { KpiItem } from './DashboardKpiPanel';
export { default as DashboardStatsGrid } from './DashboardStatsGrid';
export type { StatItem } from './DashboardStatsGrid';
export { default as CollectionSummaryCard } from './CollectionSummaryCard';
// CollectionSummaryChart مُستبعد عمداً — يُحمَّل lazy من CollectionSummaryCard
export { default as YearComparisonCard } from './YearComparisonCard';
export { default as YoYBadge } from './YoYBadge';
