/**
 * مفاتيح TanStack Query لإشعارات المستخدم داخل التطبيق.
 */

export const notificationsKeys = {
  byUser: (userId: string | null | undefined) => ['notifications', userId] as const,
  prefix: ['notifications'] as const,
} as const;
