/**
 * هوك جلب بيانات المستفيد المرتبط بالمستخدم الحالي
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { financialKeys } from '@/lib/queryKeys/financialKeys';
import { STALE_STATIC } from '@/lib/queryStaleTime';

export const useMyBeneficiaryProfile = (userId?: string) => {
  return useQuery({
    queryKey: financialKeys.beneficiaryProfile.byUser(userId),
    queryFn: async ({ signal }) => {
      if (!userId) return null;
      const { data } = await supabase
        .from('beneficiaries_safe')
        .select('id, name, share_percentage')
        .eq('user_id', userId)
        .abortSignal(signal)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: STALE_STATIC,
  });
};
