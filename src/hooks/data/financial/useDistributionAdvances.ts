/**
 * هوك جلب بيانات السلف والترحيلات للتوزيع
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePaidAdvances = (fiscalYearId: string | undefined, enabled: boolean) => {
  return useQuery({
    queryKey: ['advance_requests', 'paid_all', fiscalYearId],
    queryFn: async () => {
      if (!fiscalYearId) return [];
      const { data, error } = await supabase
        .from('advance_requests')
        .select('beneficiary_id, amount')
        .eq('status', 'paid')
        .eq('fiscal_year_id', fiscalYearId);
      if (error) throw error;
      return (data ?? []) as { beneficiary_id: string; amount: number }[];
    },
    enabled: enabled && !!fiscalYearId,
  });
};

export const useActiveCarryforwards = (fiscalYearId: string | undefined, enabled: boolean) => {
  return useQuery({
    queryKey: ['advance_carryforward', 'active_for_distribution', fiscalYearId],
    queryFn: async () => {
      let query = supabase
        .from('advance_carryforward')
        .select('beneficiary_id, amount')
        .eq('status', 'active');
      if (fiscalYearId) {
        query = query.or(`to_fiscal_year_id.eq.${fiscalYearId},to_fiscal_year_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as { beneficiary_id: string; amount: number }[];
    },
    enabled,
  });
};
