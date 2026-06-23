/**
 * تحليلات وإحصائيات الدعم الفني
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';
import { supportKeys } from '@/lib/queryKeys/supportKeys';

/** إحصائيات الدعم الفني — RPC واحد بدلاً من 9 استعلامات */
export const useSupportStats = () => {
  return useQuery({
    queryKey: supportKeys.stats(),
    staleTime: STALE_MESSAGING,
    queryFn: async ({ signal }) => {
      const data = await rpc('get_support_stats', undefined, { signal });
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
    queryKey: supportKeys.analytics(),
    staleTime: STALE_MESSAGING,
    queryFn: async (): Promise<SupportAnalyticsData> => {
      const data = await rpc('get_support_analytics');
      // Zod: استبدال `as unknown as` السابق بتحقق فعلي من الشكل
      const { supportAnalyticsSchema, parseOrThrow } = await import('@/lib/api/schemas');
      return parseOrThrow(supportAnalyticsSchema, data, 'get_support_analytics');
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
