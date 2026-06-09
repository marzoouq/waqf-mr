/**
 * مفاتيح TanStack Query للموارد المالية (حسابات/إيرادات/مصروفات/توزيعات/ملف المستفيد)
 * — مصدر وحيد للحقيقة. استخدم `financialKeys.<group>.<name>(...)` للاستعلام،
 * و `financialKeys.<group>.prefix` للإبطال.
 *
 * ملاحظة: `createCrudFactory({ queryKey: 'accounts' | 'income' | 'expenses' })`
 * يستخدم نفس البادئة داخلياً، فالـ prefixes هنا متوافقة معه.
 */

export const financialKeys = {
  accounts: {
    byFiscalYear: (key: string | null | undefined) =>
      ['accounts', 'fiscal_year', key ?? 'all'] as const,
    prefix: ['accounts'] as const,
  },

  income: {
    byFiscalYear: (fiscalYearId: string | null | undefined) =>
      ['income', 'fiscal_year', fiscalYearId] as const,
    comparison: () => ['income_comparison_raw'] as const,
    prefix: ['income'] as const,
    comparisonPrefix: ['income_comparison_raw'] as const,
  },

  expenses: {
    byFiscalYear: (fiscalYearId: string | null | undefined) =>
      ['expenses', 'fiscal_year', fiscalYearId] as const,
    budgets: (fiscalYearId: string | null | undefined) =>
      ['expense_budgets', fiscalYearId] as const,
    prefix: ['expenses'] as const,
    budgetsPrefix: ['expense_budgets'] as const,
  },

  distributions: {
    aggregated: (fiscalYearId: string | null | undefined) =>
      ['aggregated-distributions', fiscalYearId] as const,
    my: (beneficiaryId: string | null | undefined, fiscalYearId: string | null | undefined) =>
      ['my-distributions', beneficiaryId, fiscalYearId] as const,
    prefix: ['distributions'] as const,
    myPrefix: ['my-distributions'] as const,
    aggregatedPrefix: ['aggregated-distributions'] as const,
  },

  beneficiaryProfile: {
    byUser: (userId: string | null | undefined) => ['my-beneficiary', userId] as const,
    prefix: ['my-beneficiary'] as const,
  },

  dashboard: {
    totalBeneficiaryPercentage: () => ['total-beneficiary-percentage'] as const,
  },

  fiscalYearComparison: {
    multi: (sortedIds: readonly string[]) => ['multi-year-summary', sortedIds] as const,
    pair: (year1Id: string | null | undefined, year2Id: string | null | undefined) =>
      ['year-comparison-summary', year1Id, year2Id] as const,
  },
} as const;
