/**
 * مفاتيح TanStack Query لمراقبة البريد الإلكتروني (logs + admin stats).
 */

export const emailKeys = {
  logs: (startIso: string, endIso: string) => ['email-logs', startIso, endIso] as const,
  logsPrefix: ['email-logs'] as const,
  adminStats: ['email-admin-stats'] as const,
} as const;
