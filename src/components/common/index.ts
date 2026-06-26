/**
 * Barrel — components/common (Single Entry Point)
 *
 * كل المكوّنات العامة تُصدَّر من هنا. الاستيرادات الخارجية يجب أن تكون
 * عبر `@/components/common` فقط — لا مسارات فرعية. تُفرض القاعدة عبر
 * ESLint (no-restricted-imports) و scripts/audit-conventions-deep.mjs.
 *
 * استثناء: الملفات داخل src/components/common/** تستخدم استيرادات نسبية
 * (./ أو ../sub/) لتجنّب الدورات واحتراماً لقاعدة Barrel Import Rule.
 */

// feedback
export { default as BetaBanner } from './feedback/BetaBanner';
export { default as EmptyState } from './feedback/EmptyState';
export { default as ErrorBoundary } from './feedback/ErrorBoundary';
export { default as DiagnosticOverlay } from './feedback/DiagnosticOverlay';
export { default as ConfirmDeleteDialog } from './feedback/ConfirmDeleteDialog';
export { default as WebVitalsPanel } from './feedback/WebVitalsPanel';
export { ErrorState, EmptyPageState } from './feedback/PageStateGuards';
export { TableSkeleton, DashboardSkeleton, StatsGridSkeleton, KpiSkeleton } from './feedback/SkeletonLoaders';
export { default as AnimatedCounter } from './feedback/AnimatedCounter';

// layout
export { default as PrintHeader } from './layout/PrintHeader';
export { default as PrintFooter } from './layout/PrintFooter';
export { default as LegalPageFooter } from './layout/LegalPageFooter';
export { default as MobileCardView } from './layout/MobileCardView';

// forms
export { default as ExportMenu } from './forms/ExportMenu';
export { default as LoadingButton, type LoadingButtonProps } from './forms/LoadingButton';
export { ViewModeToggle, type ViewMode } from './forms/ViewModeToggle';
export { useViewMode } from './forms/useViewMode';

// tables
export { default as TablePagination } from './tables/TablePagination';
export { default as CrudPagination } from './tables/CrudPagination';

// finance
export { default as NoPublishedYearsNotice } from './finance/NoPublishedYearsNotice';
export { default as RequirePublishedYears } from './finance/RequirePublishedYears';
export { default as LockedYearBanner } from './finance/LockedYearBanner';
export { default as FiscalYearStateNotice } from './finance/FiscalYearStateNotice';
export { default as EstimatedShareBadge } from './finance/EstimatedShareBadge';

// charts
export { default as ChartBox } from './charts/ChartBox';
export { default as ChartSkeleton } from './charts/ChartSkeleton';
export { default as MiniSparkline } from './charts/MiniSparkline';

// perf
export { default as DeferredRender } from './perf/DeferredRender';
export { default as ViewportRender } from './perf/ViewportRender';

// access
export { default as FeatureGate } from './access/FeatureGate';

// feedback (extra)
export { default as OfflineBanner } from './feedback/OfflineBanner';
export { default as PageLoader } from './feedback/PageLoader';

// tables (extra)
export { default as VirtualTable } from './tables/VirtualTable';
