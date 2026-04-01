/**
 * استعلام التوزيعات وحساب المبالغ — مفصول من useMySharePage
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeNumber } from '@/utils/safeNumber';

interface Account {
  id: string;
  fiscal_year?: string;
  fiscal_year_id?: string;
}

export function useMyShareDistributions(
  beneficiaryId: string | undefined,
  fiscalYearId: string | undefined,
  currentAccount: Account | null | undefined,
) {
  const { data: distributions = [], isLoading } = useQuery({
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

      const { data, error } = await query
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!beneficiaryId,
  });

  const filteredDistributions = useMemo(() => {
    if (currentAccount) return distributions.filter(d => d.account_id === currentAccount.id);
    if (fiscalYearId && fiscalYearId !== 'all') return distributions.filter(d => d.fiscal_year_id === fiscalYearId);
    return distributions;
  }, [distributions, currentAccount, fiscalYearId]);

  const totalReceived = useMemo(
    () => filteredDistributions.filter(d => d.status === 'paid').reduce((sum, d) => sum + safeNumber(d.amount), 0),
    [filteredDistributions],
  );

  const pendingAmount = useMemo(
    () => filteredDistributions.filter(d => d.status === 'pending').reduce((sum, d) => sum + safeNumber(d.amount), 0),
    [filteredDistributions],
  );

  return { distributions, filteredDistributions, totalReceived, pendingAmount, isLoading };
}
