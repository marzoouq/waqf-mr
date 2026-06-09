/**
 * مفاتيح TanStack Query للسنوات المالية — مصدر وحيد للحقيقة
 * استخدم `fiscalYearKeys.<name>(...)` للاستعلام، و `fiscalYearKeys.prefixes.<name>` للإبطال.
 */

export const fiscalYearKeys = {
  /** قائمة السنوات المالية حسب المستخدم (للاستعلام) */
  list: (userId: string | undefined) => ['fiscal_years', userId] as const,

  /** prefetch بدون مستخدم — يستخدم نفس بادئة `['fiscal_years']` */
  prefetch: () => ['fiscal_years'] as const,

  /** كل السنوات المنشورة (واجهة الواقف العامة) */
  publishedAll: () => ['fiscal_years_published_all'] as const,

  /** ملخص سنة مالية واحدة */
  summary: (fiscalYearId: string | undefined) => ['fiscal-year-summary', fiscalYearId] as const,

  /** ملخصات عدة سنوات (للمقارنة) — تتطلب IDs مرتّبة */
  summaries: (sortedIds: readonly string[]) => ['fiscal-year-summaries', sortedIds] as const,

  /** بادئات لاستدعاءات invalidateQueries */
  prefixes: {
    all: ['fiscal_years'] as const,
    publishedAll: ['fiscal_years_published_all'] as const,
    summary: ['fiscal-year-summary'] as const,
    summaries: ['fiscal-year-summaries'] as const,
  },
} as const;
