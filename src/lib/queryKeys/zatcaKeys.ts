/**
 * مفاتيح TanStack Query لـ ZATCA — مصدر وحيد للحقيقة
 * استخدم `zatcaKeys.<name>(...)` للاستعلام، و `zatcaKeys.prefixes.<name>` لإبطال نطاق كامل.
 */

export const zatcaKeys = {
  /** قائمة شهادات ZATCA (عرض آمن، بلا مفاتيح خاصة) */
  certificates: () => ['zatca-certificates'] as const,

  /** سجل عمليات ZATCA (آخر 50) */
  operationLog: () => ['zatca-operation-log'] as const,

  /** الإعدادات الإلزامية لبدء onboarding */
  requiredSettings: () => ['zatca-required-settings'] as const,

  /** فواتير ZATCA الإيجارية مع فلتر حالة + سنة مالية */
  invoices: (statusFilter: string, fiscalYearId: string | null) =>
    ['zatca-invoices', statusFilter, fiscalYearId] as const,

  /** فواتير الدفعات (payment) مع نفس الفلاتر */
  paymentInvoices: (statusFilter: string, fiscalYearId: string | null) =>
    ['zatca-payment-invoices', statusFilter, fiscalYearId] as const,

  /** بادئات لاستدعاءات invalidateQueries على نطاق كامل */
  prefixes: {
    certificates: ['zatca-certificates'] as const,
    operationLog: ['zatca-operation-log'] as const,
    invoices: ['zatca-invoices'] as const,
    paymentInvoices: ['zatca-payment-invoices'] as const,
  },
} as const;
