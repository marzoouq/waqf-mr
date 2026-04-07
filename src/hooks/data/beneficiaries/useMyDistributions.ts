/**
 * هوك جلب توزيعات المستفيد — مستخرج من useMySharePage و useDisclosurePage
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';

export function useMyDistributions(beneficiaryId?: string | null, fiscalYearId?: string | null) {
  return useQuery({
    queryKey: ['my-distributions', beneficiaryId, fiscalYearId],
    // #6 — staleTime: التوزيعات لا تتغير كثيراً
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      if (!beneficiaryId) return [];
      // #9 — تحديد أعمدة صريحة بدل *
      let query = supabase
        .from('distributions')
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
