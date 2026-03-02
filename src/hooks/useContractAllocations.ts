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

// O-05 fix: table exists in types — no need for `as any`
const fromAllocations = () => supabase.from('contract_fiscal_allocations');

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
      const rows = allocations.map(a => ({
        fiscal_year_id: a.fiscal_year_id,
        period_start: a.period_start,
        period_end: a.period_end,
        allocated_payments: a.allocated_payments,
        allocated_amount: a.allocated_amount,
      }));
      // Atomic RPC: delete + insert in a single transaction
      const { error } = await supabase.rpc('upsert_contract_allocations', {
        p_contract_id: contractId,
        p_allocations: JSON.parse(JSON.stringify(rows)),
      });
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
