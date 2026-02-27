/**
 * هوك تنفيذ التوزيع الفعلي عبر RPC ذري (Atomic Transaction)
 * يضمن عدم تلف البيانات في حالة فشل جزئي
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DistributionInput {
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_user_id?: string | null;
  share_amount: number;
  advances_paid: number;
  carryforward_deducted: number;
  net_amount: number;
  deficit: number;
}

interface DistributeParams {
  account_id: string;
  fiscal_year_id?: string;
  distributions: DistributionInput[];
  total_distributed: number;
}

export const useDistributeShares = () => {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['distributions'] });
    qc.invalidateQueries({ queryKey: ['my-distributions'] });
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['advance_requests'] });
    qc.invalidateQueries({ queryKey: ['advance_carryforward'] });
  };

  return useMutation({
    mutationFn: async ({ account_id, fiscal_year_id, distributions, total_distributed }: DistributeParams) => {
      const { data, error } = await supabase.rpc('execute_distribution', {
        p_account_id: account_id,
        p_fiscal_year_id: fiscal_year_id || null,
        p_total_distributed: total_distributed,
        p_distributions: JSON.parse(JSON.stringify(distributions)),
      });
      if (error) throw error;
      return data as { success: boolean; with_share: number; with_deficit: number };
    },
    onSuccess: (result) => {
      invalidateAll();
      let msg = `تم توزيع الحصص بنجاح لـ ${result.with_share} مستفيد`;
      if (result.with_deficit > 0) msg += ` (${result.with_deficit} مستفيد لديهم فروق مرحّلة)`;
      toast.success(msg);
    },
    onError: () => {
      toast.error('فشل تنفيذ التوزيع — لم يتم تعديل أي بيانات (عملية ذرية)');
      invalidateAll();
    },
  });
};
