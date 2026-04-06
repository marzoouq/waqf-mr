import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { safeNumber } from '@/utils/format/safeNumber';
import { defaultNotify } from '@/lib/notify';

/**
 * Returns the global sum of all beneficiary share percentages
 * using a SECURITY DEFINER function that bypasses RLS.
 */
export const useTotalBeneficiaryPercentage = () => {
  return useQuery({
    queryKey: ['total-beneficiary-percentage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_total_beneficiary_percentage');
      if (error) throw error;
      const result = safeNumber(data);
      if (result <= 0) return 0;
      if (result > 200) {
        defaultNotify.warning(`مجموع نسب المستفيدين غير طبيعي (${result}%) — يرجى مراجعة النسب`, { id: 'share-warning' });
      }
      return result;
    },
    staleTime: STALE_FINANCIAL,
  });
};
