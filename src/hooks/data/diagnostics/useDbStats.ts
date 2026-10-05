/**
 * useDbStats — إحصائيات صحة قاعدة البيانات (اتصالات + حجم)
 */
import { useQuery } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
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
    queryFn: async ({ signal }) => {
      const data = await rpc<DbStats | null>('admin_db_stats', undefined, { signal });
      return data as DbStats;
    },
  });
};
