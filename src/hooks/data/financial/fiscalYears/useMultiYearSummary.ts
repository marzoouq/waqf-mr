/**
 * هوك لجلب ملخص مالي لعدة سنوات عبر Edge Function `multi-year-summary`.
 * RPC مغلقة على authenticated — تُستدعى حصراً عبر Edge موثَّقة الدور.
 */
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@/lib/api/invoke';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { mapEntry, type RpcYearEntry } from '@/utils/financial/computations/multiYearHelpers';
import type { YearSummaryEntry } from '@/types/financial/multiYear';
import { financialKeys } from '@/lib/queryKeys/financialKeys';

// إعادة تصدير للتوافق العكسي مع المستهلكين الحاليين
export type { YearSummaryEntry };

export function useMultiYearSummary(yearIds: string[]) {
  const sortedIds = [...yearIds].sort();

  return useQuery<YearSummaryEntry[]>({
    queryKey: financialKeys.fiscalYearComparison.multi(sortedIds),
    enabled: sortedIds.length > 0,
    staleTime: STALE_FINANCIAL,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const data = await invoke<RpcYearEntry[]>('multi-year-summary', {
        body: { year_ids: sortedIds },
      });
      return (data ?? []).map(mapEntry);
    },
  });
}
