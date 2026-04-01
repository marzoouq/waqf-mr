/**
 * هوكات الدعم الفني — barrel re-export للتوافق الرجعي
 * الملفات الفرعية: useTicketReplies, useSupportStats, useSupportMutations, supportTypes
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_REALTIME } from '@/lib/queryStaleTime';
import { TICKET_SELECT } from './supportTypes';
import type { SupportTicket } from './supportTypes';

// إعادة تصدير للتوافق الرجعي
export type { SupportTicket, TicketReply, ClientError, SupportAnalyticsData } from './supportTypes';
export { useCreateTicket, useUpdateTicketStatus, useAddTicketReply, useRateTicket } from './useSupportMutations';
export { useTicketReplies } from './useTicketReplies';
export { useClientErrors, useSupportStats, useSupportAnalytics } from './useSupportStats';

/** جلب التذاكر مع server-side pagination */
export const useSupportTickets = (statusFilter?: string, page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['support_tickets', statusFilter ?? 'all', page, pageSize],
    staleTime: STALE_REALTIME,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('support_tickets')
        .select(TICKET_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return {
        tickets: (data ?? []) as SupportTicket[],
        totalCount: count ?? 0,
      };
    },
  });
};

/** تصدير التذاكر — جلب عند الطلب فقط */
export async function fetchTicketsForExport() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('ticket_number, title, category, priority, status, created_at, resolved_at, rating')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data ?? [];
}
