/**
 * هوك بيانات سجل الوصول — استعلامات للتبويب
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';
import { PAGE_SIZE_AUDIT } from '@/constants/pagination';

export const ACCESS_LOG_ITEMS_PER_PAGE = PAGE_SIZE_AUDIT;

export interface AccessLogEntry {
  id: string;
  event_type: string;
  email: string | null;
  user_id: string | null;
  device_info: string | null;
  target_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const useAccessLogTab = (eventFilter: string, currentPage: number, searchQuery = '') => {
  return useQuery({
    queryKey: ['access_log', eventFilter, currentPage, searchQuery],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const from = (currentPage - 1) * ACCESS_LOG_ITEMS_PER_PAGE;
      let query = supabase
        .from('access_log')
        .select('id, event_type, email, user_id, device_info, target_path, metadata, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + ACCESS_LOG_ITEMS_PER_PAGE - 1);
      if (eventFilter !== 'all') {
        query = query.eq('event_type', eventFilter);
      }
      const q = searchQuery.trim();
      if (q.length > 0) {
        // تنظيف % و _ لمنع wildcards غير مقصودة
        const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
        query = query.or(
          `email.ilike.%${safe}%,target_path.ilike.%${safe}%,device_info.ilike.%${safe}%`,
        );
      }
      const { data, error, count } = await query;
      if (error) throw error;
      // select() → metadata: Json ≠ Record<string,unknown> — يحتاج Zod validation لاحقاً
      return { logs: (data || []) as unknown as AccessLogEntry[], totalCount: count ?? 0 };
    },
  });
};

export const useFailedLoginsToday = () => {
  return useQuery({
    queryKey: ['access_log_failed_today'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('access_log')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'login_failed')
        .gte('created_at', todayStr);
      return count ?? 0;
    },
  });
};

export const useUnauthorizedAccessToday = () => {
  return useQuery({
    queryKey: ['access_log_unauthorized_today'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('access_log')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'unauthorized_access')
        .gte('created_at', todayStr);
      return count ?? 0;
    },
  });
};
