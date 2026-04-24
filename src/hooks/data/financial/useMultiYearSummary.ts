/**
 * هوك لجلب ملخص مالي لعدة سنوات في استدعاء RPC واحد
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { mapEntry, type RpcYearEntry } from '@/utils/financial/multiYearHelpers';
import type { YearSummaryEntry } from '@/types/financial/multiYear';

// إعادة تصدير للتوافق العكسي مع المستهلكين الحاليين
export type { YearSummaryEntry };

export function useMultiYearSummary(yearIds: string[]) {
  const sortedIds = [...yearIds].sort();

  return useQuery<YearSummaryEntry[]>({
    queryKey: ['multi-year-summary', sortedIds],
    enabled: sortedIds.length > 0,
    staleTime: STALE_FINANCIAL,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_multi_year_summary', {
        p_year_ids: sortedIds,
      });
      if (error) throw error;
      // RPC — cast مبرر، يحتاج Zod validation لاحقاً
      const arr = data as unknown as RpcYearEntry[];
      return (arr ?? []).map(mapEntry);
    },
  });
}
