import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import type { FiscalAllocation } from '@/utils/financial/contractAllocation';
import { isFyAll } from '@/constants/fiscalYearIds';

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

const ALLOCATION_LIMIT = 500;

export const useContractAllocations = (fiscalYearId?: string | null) => {
  return useQuery({
    queryKey: ['contract_fiscal_allocations', fiscalYearId],
    // منع الجلب قبل تحديد السنة المالية (#83)
    enabled: fiscalYearId !== undefined,
    queryFn: async () => {
      let query = supabase
        .from('contract_fiscal_allocations')
        .select('id, contract_id, fiscal_year_id, period_start, period_end, allocated_payments, allocated_amount, created_at')
        .limit(ALLOCATION_LIMIT);
      if (fiscalYearId && !isFyAll(fiscalYearId)) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      const results = (data ?? []) as ContractFiscalAllocation[];
      // تحذير عند الوصول لحد السجلات (#28)
      if (results.length >= ALLOCATION_LIMIT) {
        logger.warn(`تخصيصات العقود وصلت للحد الأقصى (${ALLOCATION_LIMIT}) — قد تكون بيانات مفقودة`);
      }
      return results;
    },
    staleTime: STALE_FINANCIAL,
  });
};

export const useUpsertContractAllocations = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (allocations: FiscalAllocation[]) => {
      if (allocations.length === 0) return;
      const contractId = allocations[0]!.contract_id;
      const rows = allocations.map(a => ({
        fiscal_year_id: a.fiscal_year_id,
        period_start: a.period_start,
        period_end: a.period_end,
        allocated_payments: a.allocated_payments,
        allocated_amount: a.allocated_amount,
      }));
      // تمرير rows مباشرة — Supabase JS client يتعامل مع objects (#55)
      const { error } = await supabase.rpc('upsert_contract_allocations', {
        p_contract_id: contractId,
        // Supabase JSON parameter — cast ضروري لأن RPC يتوقع Json
        p_allocations: rows as unknown as import('@/integrations/supabase/types').Json,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_fiscal_allocations'] });
    },
    onError: (error: Error) => {
      logger.error('Allocation error:', error.message);
      defaultNotify.error('خطأ في حفظ تخصيصات العقد');
    },
  });
};
