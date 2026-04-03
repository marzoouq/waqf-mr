/**
 * هوك جلب توزيعات المستفيد — مستخرج من useMySharePage و useDisclosurePage
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMyDistributions(beneficiaryId?: string | null, fiscalYearId?: string | null) {
  return useQuery({
    queryKey: ['my-distributions', beneficiaryId, fiscalYearId],
    queryFn: async () => {
      if (!beneficiaryId) return [];
      let query = supabase
        .from('distributions')
        .select('*, account:accounts(id, fiscal_year, fiscal_year_id)')
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
