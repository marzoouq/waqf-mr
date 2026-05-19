/**
 * هوك جلب الحد الأقصى للسلفة من الخادم — يستخدم useQuery بدل useEffect
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { uiNotify } from '@/lib/notify';

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

  const { data: serverData = null, isLoading: loading } = useQuery<ServerAdvanceData | null>({
    queryKey: ['max-advance', beneficiaryId, fiscalYearId],
    enabled: enabled && !!beneficiaryId && !!fiscalYearId,
    staleTime: 30_000,
    queryFn: async () => {
      try {
        const data = await rpc('get_max_advance_amount', {
          p_beneficiary_id: beneficiaryId,
          p_fiscal_year_id: fiscalYearId!,
        });
        // RPC — cast مبرر، يحتاج Zod validation لاحقاً
        return data as unknown as ServerAdvanceData;
      } catch (e) {
        uiNotify.warning('تعذّر التحقق من الحد الأقصى — يُرجى المراجعة يدوياً');
        throw e;
      }
    },
  });

  const reset = () => {
    queryClient.removeQueries({ queryKey: ['max-advance', beneficiaryId, fiscalYearId] });
  };

  return { serverData, loading, reset };
};
