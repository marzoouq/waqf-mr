/**
 * هوك إدارة فواتير الدفعات الإلكترونية
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentInvoice {
  id: string;
  contract_id: string;
  fiscal_year_id: string | null;
  invoice_number: string;
  payment_number: number;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  paid_date: string | null;
  paid_amount: number;
  notes: string | null;
  vat_rate: number;
  vat_amount: number;
  zatca_uuid: string | null;
  zatca_status: string;
  file_path: string | null;
  created_at: string;
  updated_at: string;
  contract?: {
    contract_number: string;
    tenant_name: string;
    property_id: string;
    payment_count: number;
    property?: { property_number: string } | null;
  };
}

export const usePaymentInvoices = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['payment_invoices', fiscalYearId],
    enabled: fiscalYearId !== '__none__',
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('payment_invoices')
        .select('*, contract:contracts(contract_number, tenant_name, property_id, payment_count, property:properties(property_number))')
        .order('due_date', { ascending: true })
        .limit(1000);
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PaymentInvoice[];
    },
  });
};

export const useGenerateContractInvoices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase.rpc('generate_contract_invoices', {
        p_contract_id: contractId,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['payment_invoices'] });
      toast.success(`تم توليد ${count} فاتورة`);
    },
    onError: () => toast.error('فشل توليد الفواتير'),
  });
};

export const useGenerateAllInvoices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_all_active_invoices');
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['payment_invoices'] });
      toast.success(`تم توليد ${count} فاتورة لجميع العقود النشطة`);
    },
    onError: () => toast.error('فشل توليد الفواتير'),
  });
};

export const useMarkInvoicePaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, paidAmount }: { invoiceId: string; paidAmount?: number }) => {
      const { data, error } = await supabase.rpc('pay_invoice_and_record_collection', {
        p_invoice_id: invoiceId,
        p_paid_amount: paidAmount ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_invoices'] });
      qc.invalidateQueries({ queryKey: ['tenant_payments'] });
      qc.invalidateQueries({ queryKey: ['income'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('تم تسديد الفاتورة وتسجيل التحصيل');
    },
    onError: () => toast.error('فشل تسديد الفاتورة'),
  });
};

export const useMarkInvoiceUnpaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.rpc('unpay_invoice_and_revert_collection', {
        p_invoice_id: invoiceId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_invoices'] });
      qc.invalidateQueries({ queryKey: ['tenant_payments'] });
      qc.invalidateQueries({ queryKey: ['income'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('تم إلغاء التسديد والتراجع عن التحصيل');
    },
    onError: () => toast.error('فشل إلغاء التسديد'),
  });
};
