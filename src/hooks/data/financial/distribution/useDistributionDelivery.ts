/**
 * Pending distributions of a fiscal year and admin delivery confirmation.
 * طبقة بيانات نقية: لا توستات هنا.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';
import { financialKeys } from '@/lib/queryKeys/financialKeys';

export type DeliveryMethod = 'cash' | 'bank_transfer' | 'cheque' | 'other';

export interface PendingDistribution {
  id: string;
  amount: number;
  beneficiary_name: string;
}

export const usePendingDistributions = (fiscalYearId: string | undefined) =>
  useQuery({
    queryKey: [...financialKeys.distributions.prefix, 'pending', fiscalYearId],
    enabled: !!fiscalYearId && fiscalYearId !== 'all',
    staleTime: 60_000,
    queryFn: async (): Promise<PendingDistribution[]> => {
      const { data, error } = await supabase
        .from('distributions')
        .select('id, amount, beneficiaries(name)')
        .eq('fiscal_year_id', fiscalYearId as string)
        .eq('status', 'pending')
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        beneficiary_name: (d.beneficiaries as { name: string } | null)?.name ?? '—',
      }));
    },
  });

export const useConfirmDistributionDelivery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { ids: string[]; paidAt: string; method: DeliveryMethod; reference?: string }) =>
      rpc('confirm_distribution_delivery', {
        p_ids: p.ids,
        p_paid_at: p.paidAt,
        p_method: p.method,
        p_reference: p.reference ?? null,
      }) as Promise<number>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financialKeys.distributions.prefix });
      qc.invalidateQueries({ queryKey: financialKeys.distributions.myPrefix });
    },
  });
};
