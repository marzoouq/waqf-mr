/**
 * مفاتيح TanStack Query لإدارة المستخدمين (Admin Users).
 * — تشمل قائمة المستخدمين، المستفيدين غير المرتبطين، وأعداد الأدوار.
 */

export const adminUsersKeys = {
  users: {
    list: (page: number) => ['admin-users', page] as const,
    prefix: ['admin-users'] as const,
  },
  orphanedBeneficiaries: ['orphaned-beneficiaries'] as const,
  unlinkedBeneficiaries: ['unlinked-beneficiaries'] as const,
  roleCounts: ['user-role-counts'] as const,
} as const;
