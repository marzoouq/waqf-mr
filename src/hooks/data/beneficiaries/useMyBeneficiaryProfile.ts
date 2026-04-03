/**
 * هوك جلب بيانات المستفيد المرتبط بالمستخدم الحالي
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMyBeneficiaryProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['my-beneficiary', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('beneficiaries_safe')
        .select('id, name, share_percentage')
        .eq('user_id', userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });
};
