/**
 * هوكات استعلام تذاكر الدعم الفني — queries فقط
 * Mutations مفصولة في useSupportMutations.ts
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_REALTIME, STALE_MESSAGING, STALE_LIVE } from '@/lib/queryStaleTime';
import { TICKET_SELECT } from './supportTypes';
import type { SupportTicket, TicketReply, ClientError, SupportAnalyticsData } from './supportTypes';

// إعادة تصدير الأنواع والمكونات للتوافق الرجعي
export type { SupportTicket, TicketReply, ClientError, SupportAnalyticsData } from './supportTypes';
export { useCreateTicket, useUpdateTicketStatus, useAddTicketReply, useRateTicket } from './useSupportMutations';

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

/** جلب ردود تذكرة */
export const useTicketReplies = (ticketId?: string) => {
  return useQuery({
    queryKey: ['ticket_replies', ticketId],
    staleTime: STALE_LIVE,
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_ticket_replies')
        .select('id, ticket_id, sender_id, content, is_internal, created_at')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as TicketReply[];
    },
  });
};

/** جلب أخطاء التطبيق من سجل الوصول */
export const useClientErrors = () => {
  return useQuery({
    queryKey: ['client_errors'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_log')
        .select('id, event_type, target_path, metadata, created_at, user_id, email')
        .eq('event_type', 'client_error')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ClientError[];
    },
  });
};

/** إحصائيات الدعم الفني — RPC واحد */
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

/** تحليلات الدعم المجمّعة */
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
