/**
 * مفاتيح TanStack Query للمستفيدين — مصدر وحيد للحقيقة
 * يشمل: beneficiaries (CRUD)، beneficiaries-safe، beneficiary-dashboard، beneficiary-users، beneficiary-distribution-history
 *
 * ملاحظة: مفتاح `beneficiaries` (الجدول الخام مع PII) يُدار داخلياً عبر CRUD factory
 * في `useBeneficiaries.ts` — لا يُستخدم خارج طبقة CRUD. هنا نوفّر `prefixes.crud` للإبطال فقط.
 */

export const beneficiariesKeys = {
  /** العرض الآمن (بدون PII) — للقراءة العامة */
  safe: () => ['beneficiaries-safe'] as const,

  /** الفئة الفرعية: مستقبلو الإشعارات */
  notificationRecipients: () => ['beneficiaries-safe', 'notifications-recipients'] as const,

  /** الفئة الفرعية: مستقبلو الرسائل الجماعية */
  messagingRecipients: () => ['beneficiaries-safe', 'messaging-recipients'] as const,

  /** بيانات مفكوكة التشفير — ناظر/محاسب فقط */
  decrypted: () => ['beneficiaries-decrypted'] as const,

  /** المستخدمون المرشحون للربط (دور beneficiary) */
  users: () => ['beneficiary-users'] as const,

  /** لوحة المستفيد عبر RPC */
  dashboard: (userId: string | undefined, fiscalYearId: string | undefined) =>
    ['beneficiary-dashboard', userId, fiscalYearId] as const,

  /** تاريخ توزيعات مستفيد محدد */
  distributionHistory: (beneficiaryId: string) =>
    ['beneficiary-distribution-history', beneficiaryId] as const,

  /** بادئات للإبطال على نطاق كامل */
  prefixes: {
    /** جدول CRUD الخام — يستخدمه useUpdateBeneficiarySelf فقط */
    crud: ['beneficiaries'] as const,
    safe: ['beneficiaries-safe'] as const,
    dashboard: ['beneficiary-dashboard'] as const,
  },
} as const;
