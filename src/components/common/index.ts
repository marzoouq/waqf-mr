/**
 * Barrel — components/common
 *
 * مكونات قابلة لإعادة الاستخدام عبر التطبيق، مقسّمة إلى:
 * feedback / layout / forms / tables / finance.
 * تم تقسيم الملفات في المرحلة 2.1 — البارّل يحافظ على نفس واجهة الاستيراد الخارجية.
 */

// feedback
export { default as BetaBanner } from './feedback/BetaBanner';
export { default as EmptyState } from './feedback/EmptyState';
export { default as ErrorBoundary } from './feedback/ErrorBoundary';
export { default as DiagnosticOverlay } from './feedback/DiagnosticOverlay';
export { default as ConfirmDeleteDialog } from './feedback/ConfirmDeleteDialog';
export { default as WebVitalsPanel } from './feedback/WebVitalsPanel';
export { ErrorState, EmptyPageState } from './feedback/PageStateGuards';
export { TableSkeleton, DashboardSkeleton, StatsGridSkeleton, KpiSkeleton, ChartSkeleton } from './feedback/SkeletonLoaders';

// layout
export { default as PrintHeader } from './layout/PrintHeader';
export { default as PrintFooter } from './layout/PrintFooter';
export { default as LegalPageFooter } from './layout/LegalPageFooter';
export { default as MobileCardView } from './layout/MobileCardView';

// forms
export { default as ExportMenu } from './forms/ExportMenu';
export { ViewModeToggle, useViewMode, type ViewMode } from './forms/ViewModeToggle';

// tables
export { default as TablePagination } from './tables/TablePagination';
export { default as CrudPagination } from './tables/CrudPagination';

// finance (no change)
export { default as NoPublishedYearsNotice } from './finance/NoPublishedYearsNotice';
export { default as RequirePublishedYears } from './finance/RequirePublishedYears';
export { default as LockedYearBanner } from './finance/LockedYearBanner';
export { default as FiscalYearStateNotice } from './finance/FiscalYearStateNotice';
export { default as EstimatedShareBadge } from './finance/EstimatedShareBadge';

// root (uncategorized — small / cross-cutting)
export { default as DeferredRender } from './DeferredRender';
