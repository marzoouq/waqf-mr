/**
 * zatcaInvoicesService — قراءة فواتير ZATCA + payment_invoices + invoice_chain.
 * مستخرج من useZatcaInvoices.ts ضمن M2.5. مكمّل لـ zatcaService.ts.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const INVOICES_FIELDS =
  'id, invoice_number, invoice_type, amount, vat_amount, vat_rate, date, zatca_status, zatca_uuid, zatca_xml, invoice_hash, icv, fiscal_year_id';

const PAYMENT_INVOICES_FIELDS =
  'id, invoice_number, amount, vat_amount, vat_rate, due_date, zatca_status, zatca_uuid, zatca_xml, invoice_hash, icv, invoice_type, fiscal_year_id';

export interface ZatcaInvoiceFilters {
  statusFilter: string; // 'all' أو حالة محددة
  fiscalYearId?: string | null;
}

export const zatcaInvoicesService = {
  async listInvoices(filters: ZatcaInvoiceFilters) {
    let q = supabase
      .from('invoices')
      .select(INVOICES_FIELDS)
      .order('date', { ascending: false })
      .limit(1000);
    if (filters.statusFilter !== 'all') q = q.eq('zatca_status', filters.statusFilter);
    if (filters.fiscalYearId && filters.fiscalYearId !== 'all') {
      q = q.eq('fiscal_year_id', filters.fiscalYearId);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((i) => ({ ...i, source: 'invoices' as const }));
  },

  async listPaymentInvoices(filters: ZatcaInvoiceFilters) {
    let q = supabase
      .from('payment_invoices')
      .select(PAYMENT_INVOICES_FIELDS)
      .order('due_date', { ascending: false })
      .limit(1000);
    if (filters.statusFilter !== 'all') q = q.eq('zatca_status', filters.statusFilter);
    if (filters.fiscalYearId && filters.fiscalYearId !== 'all') {
      q = q.eq('fiscal_year_id', filters.fiscalYearId);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((i) => ({ ...i, source: 'payment_invoices' as const, date: i.due_date }));
  },

  async listInvoiceChain() {
    const limit = 1000;
    const { data, error } = await supabase
      .from('invoice_chain')
      .select('id, invoice_id, icv, previous_hash, invoice_hash, source_table, created_at')
      .order('icv', { ascending: false })
      .limit(limit);
    if (error) throw error;
    if (data && data.length >= limit) {
      logger.warn(`invoice_chain query hit limit (${limit})`);
    } else if (data && data.length >= 900) {
      logger.warn(`invoice_chain approaching limit: ${data.length}/${limit}`);
    }
    return {
      records: data,
      limitReached: (data?.length ?? 0) >= limit,
      approachingLimit: (data?.length ?? 0) >= 900,
    };
  },
};
