/**
 * Barrel — components/common
 *
 * مكونات قابلة لإعادة الاستخدام عبر التطبيق:
 * أعمدة حالة، حوارات تأكيد، skeletons، pagination، print headers،
 * بانرات وتنبيهات، ولوحة تشخيص الأداء (WebVitalsPanel).
 */
export { default as BetaBanner } from './BetaBanner';
export { default as EmptyState } from './EmptyState';
export { default as CrudPagination } from './CrudPagination';
export { default as DeferredRender } from './DeferredRender';
export { default as DiagnosticOverlay } from './DiagnosticOverlay';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as ExportMenu } from './ExportMenu';
export { default as LegalPageFooter } from './LegalPageFooter';
export { default as MobileCardView } from './MobileCardView';
export { default as NoPublishedYearsNotice } from './finance/NoPublishedYearsNotice';
export { default as PrintFooter } from './PrintFooter';
export { default as PrintHeader } from './PrintHeader';
export { default as RequirePublishedYears } from './finance/RequirePublishedYears';
export { TableSkeleton, DashboardSkeleton, StatsGridSkeleton, KpiSkeleton, ChartSkeleton } from './SkeletonLoaders';

export { default as TablePagination } from './TablePagination';
export { default as LockedYearBanner } from './finance/LockedYearBanner';
export { ErrorState, EmptyPageState } from './PageStateGuards';
export { default as ConfirmDeleteDialog } from './ConfirmDeleteDialog';
export { default as WebVitalsPanel } from './WebVitalsPanel';
export { default as FiscalYearStateNotice } from './finance/FiscalYearStateNotice';
export { default as EstimatedShareBadge } from './finance/EstimatedShareBadge';
export { ViewModeToggle, useViewMode, type ViewMode } from './ViewModeToggle';
