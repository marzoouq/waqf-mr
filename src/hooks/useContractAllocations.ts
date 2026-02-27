import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FiscalAllocation } from '@/utils/contractAllocation';

export interface ContractFiscalAllocation {
  id: string;
  contract_id: string;
  fiscal_year_id: string;
  period_start: string;
  period_end: string;
  allocated_payments: number;
  allocated_amount: number;
  created_at: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromAllocations = () => (supabase as any).from('contract_fiscal_allocations');

export const useContractAllocations = (fiscalYearId?: string | null) => {
  return useQuery({
    queryKey: ['contract_fiscal_allocations', fiscalYearId],
    queryFn: async () => {
      let query = fromAllocations().select('*').limit(500);
      if (fiscalYearId && fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ContractFiscalAllocation[];
    },
    staleTime: 60_000,
  });
};

export const useUpsertContractAllocations = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (allocations: FiscalAllocation[]) => {
      if (allocations.length === 0) return;
      const contractId = allocations[0].contract_id;
      await fromAllocations().delete().eq('contract_id', contractId);
      const rows = allocations.map(a => ({
        contract_id: a.contract_id,
        fiscal_year_id: a.fiscal_year_id,
        period_start: a.period_start,
        period_end: a.period_end,
        allocated_payments: a.allocated_payments,
        allocated_amount: a.allocated_amount,
      }));
      const { error } = await fromAllocations().insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_fiscal_allocations'] });
    },
    onError: (error: Error) => {
      console.error('Allocation error:', error.message);
      toast.error('خطأ في حفظ تخصيصات العقد');
    },
  });
};
