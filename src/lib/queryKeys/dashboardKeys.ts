/**
 * مفاتيح React Query موحّدة لاستعلامات لوحة التحكم.
 *
 * مصدر حقيقة واحد لمنع drift بين useDashboardSummary / useDashboardPrefetch /
 * useDashboardRealtime — أي تعديل على شكل المفتاح يجب أن يحدث هنا فقط.
 *
 * ملاحظة: useDashboardRealtime يستخدم prefix-match (predicate على queryKey[0])،
 * لذا أول عنصر في كل مفتاح يجب أن يبقى ثابتاً.
 */
export const dashboardKeys = {
  /**
   * مفتاح ملخص اللوحة — يعتمد على `fiscalYearId` فقط.
   * `fiscalYearLabel` تم استبعاده عمداً لمنع double-invalidation
   * حين يصل اللابل متأخراً بعد ID أثناء التحميل.
   */
  summary: (fiscalYearId: string) =>
    ['dashboard-summary', fiscalYearId] as const,
  heatmap: (fiscalYearId: string) =>
    ['dashboard-heatmap', fiscalYearId] as const,
  recentContracts: (fiscalYearId: string) =>
    ['dashboard-recent-contracts', fiscalYearId] as const,

  /** Prefixes — للاستخدام في realtime invalidation عبر extraKeys */
  prefixes: {
    summary: ['dashboard-summary'] as const,
    heatmap: ['dashboard-heatmap'] as const,
    recentContracts: ['dashboard-recent-contracts'] as const,
  },
} as const;
