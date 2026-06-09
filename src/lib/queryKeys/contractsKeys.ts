/**
 * مفاتيح TanStack Query للعقود والعقارات/الوحدات — مصدر وحيد للحقيقة.
 * استخدم `contractsKeys.<name>(...)` للاستعلام، و `contractsKeys.prefixes.<name>` للإبطال.
 */

export const contractsKeys = {
  /** قائمة العقود (PII) حسب السنة المالية */
  byFiscalYear: (fiscalYearId: string | null | undefined) =>
    ['contracts', 'fiscal_year', fiscalYearId] as const,

  /** قائمة العقود الآمنة (بدون PII) حسب السنة المالية — يستخدم view contracts_safe */
  safeByFiscalYear: (fiscalYearId: string | null | undefined) =>
    ['contracts_safe', 'fiscal_year', fiscalYearId] as const,

  /** توزيعات العقود على السنوات المالية */
  allocations: (fiscalYearId: string | null | undefined) =>
    ['contract_fiscal_allocations', fiscalYearId] as const,

  /** دفعات المستأجرين (كل السجلات) */
  tenantPayments: () => ['tenant_payments'] as const,

  /** وحدات عقار محدد */
  units: (propertyId: string | undefined) => ['units', propertyId] as const,

  /** كل الوحدات (لكل العقارات) */
  allUnits: () => ['all-units'] as const,

  /** أسماء العقارات حسب IDs */
  propertiesNames: (propertyIds: readonly string[]) =>
    ['properties_names', propertyIds] as const,

  /** بادئات لاستدعاءات invalidateQueries */
  prefixes: {
    contracts: ['contracts'] as const,
    contractsSafe: ['contracts_safe'] as const,
    allocations: ['contract_fiscal_allocations'] as const,
    tenantPayments: ['tenant_payments'] as const,
    units: ['units'] as const,
    allUnits: ['all-units'] as const,
    propertiesNames: ['properties_names'] as const,
  },
} as const;
