import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenantPayment {
  id: string;
  contract_id: string;
  paid_months: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useTenantPayments = () => {
  return useQuery({
    queryKey: ['tenant_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_payments')
        .select('*');
      if (error) throw error;
      return data as TenantPayment[];
    },
  });
};

export const useUpsertTenantPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: { contract_id: string; paid_months: number; notes?: string }) => {
      const { data, error } = await supabase
        .from('tenant_payments')
        .upsert(
          {
            contract_id: payment.contract_id,
            paid_months: payment.paid_months,
            notes: payment.notes || null,
          },
          { onConflict: 'contract_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_payments'] });
      toast.success('تم حفظ بيانات التحصيل');
    },
    onError: (error: Error) => {
      toast.error('خطأ في حفظ بيانات التحصيل: ' + error.message);
    },
  });
};
