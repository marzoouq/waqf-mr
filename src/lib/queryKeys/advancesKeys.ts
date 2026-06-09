/**
 * مفاتيح TanStack Query للسلف والمرحّل — مصدر وحيد للحقيقة
 * يشمل: advance_requests، advance_carryforward، max-advance، my_beneficiary_finance(_raw)
 */

export const advancesKeys = {
  // ─── advance_requests ───────────────────────────────────────────────
  /** طلبات السلف لسنة مالية محددة (أو 'all') */
  requestsByFiscalYear: (fiscalYearId: string | 'all') =>
    ['advance_requests', fiscalYearId ?? 'all'] as const,

  /** السلف المدفوعة لكل المستفيدين في سنة (للتوزيع) */
  paidAllByFiscalYear: (fiscalYearId: string | undefined) =>
    ['advance_requests', 'paid_all', fiscalYearId] as const,

  // ─── advance_carryforward ──────────────────────────────────────────
  /** كل المرحّلات (للناظر) لسنة مالية */
  carryforwardAll: (fiscalYearId: string | undefined) =>
    ['advance_carryforward', 'all', fiscalYearId] as const,

  /** المرحّلات النشطة المخصصة للتوزيع في سنة */
  carryforwardActiveForDistribution: (fiscalYearId: string | undefined) =>
    ['advance_carryforward', 'active_for_distribution', fiscalYearId] as const,

  // ─── max-advance (RPC) ─────────────────────────────────────────────
  maxAdvance: (beneficiaryId: string, fiscalYearId: string | undefined) =>
    ['max-advance', beneficiaryId, fiscalYearId] as const,

  // ─── my_beneficiary_finance ────────────────────────────────────────
  /** بيانات raw للسلف+المرحّل لمستفيد محدد (طبقة data) */
  myFinanceRaw: (beneficiaryId: string | undefined) =>
    ['my_beneficiary_finance_raw', beneficiaryId] as const,

  /** بادئات للإبطال على نطاق كامل + استخدامها في useRetryQueries */
  prefixes: {
    requests: ['advance_requests'] as const,
    carryforward: ['advance_carryforward'] as const,
    myFinance: ['my_beneficiary_finance'] as const,
    myFinanceRaw: ['my_beneficiary_finance_raw'] as const,
    maxAdvance: ['max-advance'] as const,
  },
} as const;
