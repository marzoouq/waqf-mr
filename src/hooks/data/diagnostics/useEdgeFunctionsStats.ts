/**
 * useEdgeFunctionsStats — إحصائيات استدعاء Edge Functions (نجاح/فشل/زمن)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

export interface EdgeFunctionStat {
  function_name: string;
  total: number;
  errors: number;
  avg_ms: number | null;
}

export interface EdgeFunctionsStatsResult {
  since: string;
  hours: number;
  functions: EdgeFunctionStat[];
}

export const useEdgeFunctionsStats = (hours = 24) => {
  return useQuery({
    queryKey: ['diagnostics', 'edge_functions_stats', hours] as const,
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_edge_functions_stats', { p_hours: hours });
      if (error) throw error;
      return data as unknown as EdgeFunctionsStatsResult;
    },
  });
};
