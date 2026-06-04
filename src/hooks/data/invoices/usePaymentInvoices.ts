/**
 * هوك إدارة فواتير الدفعات الإلكترونية
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { uiNotify } from '@/lib/notify';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';

export type { PaymentInvoice } from '@/types/invoices';
import type { PaymentInvoice } from '@/types/invoices';

export const usePaymentInvoices = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['payment_invoices', fiscalYearId],
    enabled: isFyReady(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      let query = supabase
        .from('payment_invoices')
        .select('id, contract_id, fiscal_year_id, invoice_number, payment_number, due_date, amount, status, paid_date, paid_amount, notes, vat_rate, vat_amount, zatca_uuid, zatca_status, file_path, created_at, updated_at, contract:contracts(contract_number, tenant_name, property_id, payment_count, status, property:properties(property_number))')
        .order('due_date', { ascending: true })
        .limit(1000);
      if (!isFyAll(fiscalYearId)) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      // nested join contract→property — cast مطلوب للعلاقة المتداخلة
      return data as unknown as PaymentInvoice[];
    },
    meta: { warnLimit: 1000 },
  });
};

export const useGenerateContractInvoices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contractId: string) => {
      const data = await rpc<number>('generate_contract_invoices', {
        p_contract_id: contractId,
      });
      return data;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['payment_invoices'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      uiNotify.success(`تم توليد ${count} فاتورة`);
    },
    onError: () => uiNotify.error('فشل توليد الفواتير'),
  });
};

export const useGenerateAllInvoices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const data = await rpc<number>('generate_all_active_invoices');
      return data;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['payment_invoices'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      uiNotify.success(`تم توليد ${count} فاتورة لجميع العقود النشطة`);
    },
    onError: () => uiNotify.error('فشل توليد الفواتير'),
  });
};

export const useMarkInvoicePaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, paidAmount }: { invoiceId: string; paidAmount?: number }) => {
      return await rpc('pay_invoice_and_record_collection', {
        p_invoice_id: invoiceId,
        p_paid_amount: paidAmount ?? undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_invoices'] });
      qc.invalidateQueries({ queryKey: ['tenant_payments'] });
      qc.invalidateQueries({ queryKey: ['income'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      uiNotify.success('تم تسديد الفاتورة وتسجيل التحصيل');
    },
    onError: () => uiNotify.error('فشل تسديد الفاتورة'),
  });
};

export const useMarkInvoiceUnpaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      return await rpc('unpay_invoice_and_revert_collection', {
        p_invoice_id: invoiceId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_invoices'] });
      qc.invalidateQueries({ queryKey: ['tenant_payments'] });
      qc.invalidateQueries({ queryKey: ['income'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      uiNotify.success('تم إلغاء التسديد والتراجع عن التحصيل');
    },
    onError: () => uiNotify.error('فشل إلغاء التسديد'),
  });
};

/**
 * يحذف فواتير الدفع المعلّقة (`status='pending'`) لعقد محدد.
 * لا يلمس المدفوعة أو المتأخرة-المُحصَّلة جزئياً — يستخدمه نمط «تعديل عقد» و«إعادة توليد».
 * بدون توست (data layer pure) — الإشعارات في طبقة الصفحة.
 */
export const useDeleteContractPendingInvoices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase
        .from('payment_invoices')
        .delete()
        .eq('contract_id', contractId)
        .eq('status', 'pending')
        .select('id');
      if (error) throw error;
      return data?.length ?? 0;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_invoices'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
};

/**
 * عدّاد فواتير العقد حسب الحالة — يُستخدم في حوارات تأكيد التعديل/الحذف.
 */
export const useContractInvoiceSummary = (contractId: string | null | undefined) => {
  return useQuery({
    queryKey: ['contract_invoice_summary', contractId],
    enabled: !!contractId,
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_invoices')
        .select('status')
        .eq('contract_id', contractId!);
      if (error) throw error;
      let paidCount = 0;
      let pendingCount = 0;
      for (const row of data ?? []) {
        if (row.status === 'paid') paidCount++;
        else if (row.status === 'pending') pendingCount++;
      }
      return { paidCount, pendingCount, totalCount: data?.length ?? 0 };
    },
  });
};
