import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

interface TenantPayment {
  id: string;
  contract_id: string;
  paid_months: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface UpsertPaymentParams {
  contract_id: string;
  paid_months: number;
  notes?: string;
  /** بيانات إضافية لإنشاء سجل دخل تلقائي عند زيادة الدفعات */
  auto_income?: {
    payment_amount: number;
    property_id: string;
    fiscal_year_id: string | null;
    tenant_name: string;
    /** تاريخ الدفعة — الافتراضي تاريخ اليوم */
    payment_date?: string;
  };
}

export const useTenantPayments = () => {
  return useQuery({
    queryKey: ['tenant_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_payments')
        .select('id, contract_id, paid_months, notes, created_at, updated_at')
        .limit(500);
      if (error) throw error;
      return data as TenantPayment[];
    },
    staleTime: 60_000,
  });
};

export const useUpsertTenantPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: UpsertPaymentParams) => {
      const { data, error } = await supabase.rpc('upsert_tenant_payment', {
        p_contract_id: payment.contract_id,
        p_paid_months: payment.paid_months,
        p_notes: payment.notes ?? undefined,
        p_payment_amount: payment.auto_income?.payment_amount ?? 0,
        p_property_id: payment.auto_income?.property_id ?? undefined,
        p_fiscal_year_id: payment.auto_income?.fiscal_year_id ?? undefined,
        p_tenant_name: payment.auto_income?.tenant_name ?? undefined,
        p_payment_date: payment.auto_income?.payment_date ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_payments'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      toast.success('تم حفظ بيانات التحصيل');
    },
    onError: (error: Error) => {
      logger.error('Tenant payment error:', error.message);
      toast.error('خطأ في حفظ بيانات التحصيل');
    },
  });
};
