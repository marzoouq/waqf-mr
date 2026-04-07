/**
 * هوك بيانات تاريخ التوزيعات لمستفيد
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';

export interface DistributionRow {
  fiscal_year: string;
  amount: number;
  date: string;
  status: string;
}

/** شكل الصف المُرجع من left join مع accounts */
interface DistributionJoinRow {
  amount: number;
  date: string;
  status: string;
  account_id: string;
  accounts: { fiscal_year: string } | null;
}

export const useDistributionHistory = (beneficiaryId: string) => {
  return useQuery({
    queryKey: ['beneficiary-distribution-history', beneficiaryId],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      // left join — لا يُخفي توزيعات بدون حساب (#27)
      const { data, error } = await supabase
        .from('distributions')
        .select('amount, date, status, account_id, accounts(fiscal_year)')
        .eq('beneficiary_id', beneficiaryId)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: DistributionJoinRow) => ({
        fiscal_year: d.accounts?.fiscal_year ?? '-',
        amount: Number(d.amount),
        date: d.date,
        status: d.status,
      })) as DistributionRow[];
    },
  });
};
