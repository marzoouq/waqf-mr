/**
 * هوك جلب الحد الأقصى للسلفة من الخادم — يستخدم useQuery بدل useEffect
 * طبقة بيانات نقية: لا توستات. الخطأ يُمرَّر للمستدعي عبر `error`.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { advancesKeys } from '@/lib/queryKeys/advancesKeys';

export interface ServerAdvanceData {
  estimated_share: number;
  active_carryforward: number;
  effective_share: number;
  paid_advances: number;
  max_percentage: number;
  max_advance: number;
}

export const useMaxAdvanceAmount = (
  beneficiaryId: string,
  fiscalYearId: string | undefined,
  enabled: boolean,
) => {
  const queryClient = useQueryClient();

  const { data: serverData = null, isLoading: loading, error } = useQuery<ServerAdvanceData | null>({
    queryKey: advancesKeys.maxAdvance(beneficiaryId, fiscalYearId),
    enabled: enabled && !!beneficiaryId && !!fiscalYearId,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const data = await rpc('get_max_advance_amount', {
        p_beneficiary_id: beneficiaryId,
        p_fiscal_year_id: fiscalYearId!,
      }, { signal });
      // RPC — cast مبرر، يحتاج Zod validation لاحقاً
      return data as unknown as ServerAdvanceData;
    },
  });

  const reset = () => {
    queryClient.removeQueries({ queryKey: advancesKeys.maxAdvance(beneficiaryId, fiscalYearId) });
  };

  return { serverData, loading, error, reset };
};
