/**
 * هوك بيانات سجل الأرشيف
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

export const ARCHIVE_ITEMS_PER_PAGE = 15;

export interface ArchiveLogEntry {
  id: string;
  event_type: string;
  email: string | null;
  user_id: string | null;
  device_info: string | null;
  target_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  archived_at: string;
}

export const useArchiveLog = (eventFilter: string, currentPage: number, searchQuery = '') => {
  return useQuery({
    queryKey: ['access_log_archive', eventFilter, currentPage, searchQuery],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const from = (currentPage - 1) * ARCHIVE_ITEMS_PER_PAGE;
      let query = supabase
        .from('access_log_archive')
        .select('id, event_type, email, user_id, device_info, target_path, metadata, created_at, archived_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + ARCHIVE_ITEMS_PER_PAGE - 1);

      if (eventFilter !== 'all') {
        query = query.eq('event_type', eventFilter);
      }

      const q = searchQuery.trim();
      if (q.length > 0) {
        const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
        query = query.or(
          `email.ilike.%${safe}%,target_path.ilike.%${safe}%,device_info.ilike.%${safe}%`,
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      // select() → metadata: Json ≠ Record<string,unknown> — يحتاج Zod validation لاحقاً
      return { logs: (data || []) as unknown as ArchiveLogEntry[], totalCount: count ?? 0 };
    },
  });
};
