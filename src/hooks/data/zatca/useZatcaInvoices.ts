/**
 * useZatcaInvoices — جلب فواتير ZATCA + سلسلة التوقيع + ترقيم الصفحات + عدّادات الحالة
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { logger } from '@/lib/logger';
import { useFiscalYear } from '@/contexts/FiscalYearContext';

export const INVOICES_PER_PAGE = 20;

export function useZatcaInvoices() {
  const { fiscalYearId } = useFiscalYear();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoicePage, setInvoicePage] = useState(1);

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['zatca-invoices', statusFilter, fiscalYearId],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      let q = supabase.from('invoices').select('id, invoice_number, invoice_type, amount, vat_amount, vat_rate, date, zatca_status, zatca_uuid, zatca_xml, invoice_hash, icv, fiscal_year_id').order('date', { ascending: false }).limit(1000);
      if (statusFilter !== 'all') q = q.eq('zatca_status', statusFilter);
      if (fiscalYearId && fiscalYearId !== 'all') q = q.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(i => ({ ...i, source: 'invoices' as const }));
    },
  });

  const { data: paymentInvoices = [] } = useQuery({
    queryKey: ['zatca-payment-invoices', statusFilter, fiscalYearId],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      let q = supabase.from('payment_invoices').select('id, invoice_number, amount, vat_amount, vat_rate, due_date, zatca_status, zatca_uuid, zatca_xml, invoice_hash, icv, invoice_type, fiscal_year_id').order('due_date', { ascending: false }).limit(1000);
      if (statusFilter !== 'all') q = q.eq('zatca_status', statusFilter);
      if (fiscalYearId && fiscalYearId !== 'all') q = q.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(i => ({ ...i, source: 'payment_invoices' as const, date: i.due_date }));
    },
  });

  const allInvoices = useMemo(() => [...invoices, ...paymentInvoices], [invoices, paymentInvoices]);
  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * INVOICES_PER_PAGE;
    return allInvoices.slice(start, start + INVOICES_PER_PAGE);
  }, [allInvoices, invoicePage]);

  const { data: chain = [], isLoading: chainLoading } = useQuery({
    queryKey: ['invoice-chain'],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      const limit = 1000;
      const { data, error } = await supabase.from('invoice_chain').select('id, invoice_id, icv, previous_hash, invoice_hash, source_table, created_at').order('icv', { ascending: false }).limit(limit);
      if (error) throw error;
      if (data && data.length >= limit) {
        logger.warn(`invoice_chain query hit limit (${limit})`);
      } else if (data && data.length >= 900) {
        logger.warn(`invoice_chain approaching limit: ${data.length}/${limit}`);
      }
      return { records: data, limitReached: (data?.length ?? 0) >= limit, approachingLimit: (data?.length ?? 0) >= 900 };
    },
    select: (result) => result.records,
  });

  const submitted = allInvoices.filter(i => ['submitted', 'reported', 'cleared', 'compliance_passed'].includes(i.zatca_status || '')).length;
  const pending = allInvoices.filter(i => i.zatca_status === 'not_submitted' || !i.zatca_status).length;
  const rejected = allInvoices.filter(i => i.zatca_status === 'rejected').length;

  return {
    allInvoices, paginatedInvoices, invoicesLoading,
    chain, chainLoading,
    submitted, pending, rejected,
    statusFilter, setStatusFilter,
    invoicePage, setInvoicePage,
    INVOICES_PER_PAGE,
  };
}
