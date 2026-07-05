/**
 * useDbStats — إحصائيات صحة قاعدة البيانات (اتصالات + حجم)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

export interface DbStats {
  active_connections: number;
  total_connections: number;
  max_connections: number;
  saturation_pct: number;
  db_size_bytes: number;
  db_size_mb: number;
  measured_at: string;
}

export const useDbStats = () => {
  return useQuery({
    queryKey: ['diagnostics', 'db_stats'] as const,
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_db_stats');
      if (error) throw error;
      return data as unknown as DbStats;
    },
  });
};
