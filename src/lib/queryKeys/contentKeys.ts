/**
 * مفاتيح TanStack Query لمحتوى الموقع: التقرير السنوي، الإحصائيات العامة، اللوائح.
 */

export const contentKeys = {
  annualReport: {
    items: (fiscalYearId: string | undefined) =>
      ['annual_report_items', fiscalYearId] as const,
    itemsPrefix: ['annual_report_items'] as const,
    status: (fiscalYearId: string | undefined) =>
      ['annual_report_status', fiscalYearId] as const,
    statusPrefix: ['annual_report_status'] as const,
  },
  publicStats: ['public-stats'] as const,
  bylaws: ['waqf_bylaws'] as const,
} as const;
