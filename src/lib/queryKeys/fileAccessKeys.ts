/**
 * مفاتيح TanStack Query لأذونات الملفات الفردية
 */
export const fileAccessKeys = {
  grantableFiles: (bucket: string) => ['grantable_files', bucket] as const,
  grantableBeneficiaries: () => ['grantable_beneficiaries'] as const,
} as const;
