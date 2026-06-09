/**
 * مفاتيح TanStack Query للفواتير — مصدر وحيد للحقيقة
 * تشمل: invoices (ZATCA إيجارية)، payment_invoices (الدفعات)، invoice_chain، contract_invoice_summary
 */

export const invoicesKeys = {
  // ─── invoices (الفواتير الإيجارية) ─────────────────────────────────────
  /** فواتير سنة مالية محددة (أو 'all') */
  byFiscalYear: (fiscalYearId: string | 'all') =>
    ['invoices', 'fiscal_year', fiscalYearId] as const,

  // ─── payment_invoices (فواتير الدفعات) ─────────────────────────────────
  /** فواتير دفعات سنة مالية محددة (أو 'all') */
  paymentsByFiscalYear: (fiscalYearId: string | 'all') =>
    ['payment_invoices', fiscalYearId] as const,

  /** prefetch لكل فواتير الدفعات */
  paymentsPrefetch: () => ['payment_invoices', 'all'] as const,

  // ─── invoice_chain (سلسلة توقيع ZATCA) ────────────────────────────────
  invoiceChain: () => ['invoice-chain'] as const,

  // ─── contract_invoice_summary (عدّاد فواتير العقد) ─────────────────────
  contractSummary: (contractId: string | null | undefined) =>
    ['contract_invoice_summary', contractId] as const,

  /** بادئات للإبطال على نطاق كامل */
  prefixes: {
    invoices: ['invoices'] as const,
    paymentInvoices: ['payment_invoices'] as const,
    invoiceChain: ['invoice-chain'] as const,
    contractSummary: ['contract_invoice_summary'] as const,
  },
} as const;
