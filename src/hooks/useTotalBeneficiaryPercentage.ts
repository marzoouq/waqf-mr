import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeNumber } from '@/utils/safeNumber';

/**
 * Returns the global sum of all beneficiary share percentages
 * using a SECURITY DEFINER function that bypasses RLS.
 * This prevents the bug where a beneficiary only sees their own
 * percentage via RLS, making totalBeneficiaryPercentage == their own %.
 */
export const useTotalBeneficiaryPercentage = () => {
  return useQuery({
    queryKey: ['total-beneficiary-percentage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_total_beneficiary_percentage');
      if (error) throw error;
      return safeNumber(data);
    },
    staleTime: 60_000,
  });
};
