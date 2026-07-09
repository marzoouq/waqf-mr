/**
 * هوك جلب توزيعات المستفيد — مستخرج من useMySharePage و useDisclosurePage
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { financialKeys } from '@/lib/queryKeys/financialKeys';

export function useMyDistributions(beneficiaryId?: string | null, fiscalYearId?: string | null) {
  return useQuery({
    queryKey: financialKeys.distributions.my(beneficiaryId, fiscalYearId),
    // التوزيعات لا تتغير كثيراً — staleTime مالي مرتفع
    staleTime: STALE_FINANCIAL,
    queryFn: async ({ signal }) => {
      if (!beneficiaryId) return [];
      let query = supabase.from('distributions').abortSignal(signal)
        .select('id, amount, date, status, fiscal_year_id, beneficiary_id, account:accounts(id, fiscal_year, fiscal_year_id)')
        .eq('beneficiary_id', beneficiaryId);
      if (fiscalYearId && fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query.order('date', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!beneficiaryId,
  });
}
