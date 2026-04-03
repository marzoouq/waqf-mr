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

export const useDistributionHistory = (beneficiaryId: string) => {
  return useQuery({
    queryKey: ['beneficiary-distribution-history', beneficiaryId],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distributions')
        .select('amount, date, status, account_id, accounts!inner(fiscal_year)')
        .eq('beneficiary_id', beneficiaryId)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: Record<string, unknown>) => ({
        fiscal_year: (d.accounts as Record<string, unknown>)?.fiscal_year as string || '-',
        amount: Number(d.amount),
        date: d.date as string,
        status: d.status as string,
      })) as DistributionRow[];
    },
  });
};
