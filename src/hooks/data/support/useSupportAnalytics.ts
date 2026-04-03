/**
 * تحليلات وإحصائيات الدعم الفني
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

/** إحصائيات الدعم الفني — RPC واحد بدلاً من 9 استعلامات */
export const useSupportStats = () => {
  return useQuery({
    queryKey: ['support_stats'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_support_stats');
      if (error) throw error;
      return data as {
        totalTickets: number;
        openTickets: number;
        inProgressTickets: number;
        resolvedTickets: number;
        highPriorityTickets: number;
        ticketsLast7d: number;
        totalErrors: number;
        errorsLast24h: number;
        errorsLast7d: number;
      };
    },
  });
};

/** بيانات تحليلات الدعم المجمّعة */
export interface SupportAnalyticsData {
  category_stats: { key: string; count: number }[];
  priority_stats: { key: string; count: number }[];
  avg_resolution_hours: number;
  avg_rating: number;
  rated_count: number;
  total_count: number;
}

export const useSupportAnalytics = () => {
  return useQuery({
    queryKey: ['support_analytics'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_support_analytics');
      if (error) throw error;
      return data as unknown as SupportAnalyticsData;
    },
  });
};

/** تصدير التذاكر — جلب عند الطلب فقط (لا يُحفظ في الكاش) */
export async function fetchTicketsForExport() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('ticket_number, title, category, priority, status, created_at, resolved_at, rating')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data ?? [];
}
