/**
 * مفاتيح TanStack Query لسجل المراجعة وسجل الوصول وأخطاء العميل.
 */

export interface AuditLogFilters {
  tableName?: string;
  operation?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const auditKeys = {
  log: {
    list: (filters: AuditLogFilters | undefined, page: number, pageSize: number) =>
      [
        'audit_log',
        filters?.tableName,
        filters?.operation,
        filters?.searchQuery,
        filters?.dateFrom,
        filters?.dateTo,
        page,
        pageSize,
      ] as const,
    prefetchFirstPage: ['audit_log', { page: 1 }] as const,
    todayCount: ['audit_log_today_count'] as const,
    prefix: ['audit_log'] as const,
  },
  accessLog: {
    list: (eventFilter: string, currentPage: number, searchQuery: string) =>
      ['access_log', eventFilter, currentPage, searchQuery] as const,
    failedToday: ['access_log_failed_today'] as const,
    unauthorizedToday: ['access_log_unauthorized_today'] as const,
    prefix: ['access_log'] as const,
  },
  accessLogArchive: {
    list: (eventFilter: string, currentPage: number, searchQuery: string) =>
      ['access_log_archive', eventFilter, currentPage, searchQuery] as const,
    prefix: ['access_log_archive'] as const,
  },
  clientErrors: ['client_errors'] as const,
} as const;
