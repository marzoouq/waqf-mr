/**
 * هوكات إدارة تذاكر الدعم الفني — استعلامات + إعادة تصدير
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_REALTIME, STALE_LIVE } from '@/lib/queryStaleTime';
import { supportKeys } from '@/lib/queryKeys/supportKeys';

// إعادة تصدير من الوحدات الفرعية للتوافق مع الاستيرادات الحالية
export { useCreateTicket, useUpdateTicketStatus, useAddTicketReply, useRateTicket } from './useSupportTicketMutations';
export { useSupportStats, useSupportAnalytics, fetchTicketsForExport } from './useSupportAnalytics';
export type { SupportAnalyticsData } from './useSupportAnalytics';
export { useClientErrors } from '../audit/useClientErrors';
export type { ClientError } from '../audit/useClientErrors';

// ---------------------------------------------------------------------------
// Types — مُعرَّفة في src/types/support.ts (مصدر وحيد للحقيقة)
// تُعاد التصدير هنا للحفاظ على التوافق مع الاستيرادات الحالية.
// ---------------------------------------------------------------------------

export type { SupportTicket, TicketReply } from '@/types/support';
import type { SupportTicket, TicketReply } from '@/types/support';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const TICKET_SELECT = 'id, ticket_number, title, description, category, priority, status, created_by, assigned_to, resolved_at, resolution_notes, rating, rating_comment, created_at, updated_at';

/** جلب التذاكر مع server-side pagination */
export const useSupportTickets = (statusFilter?: string, page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: supportKeys.tickets.list(statusFilter, page, pageSize),
    staleTime: STALE_REALTIME,
    queryFn: async ({ signal: _signal }) => {
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
    queryKey: supportKeys.replies.byTicket(ticketId),
    staleTime: STALE_LIVE,
    enabled: !!ticketId,
    queryFn: async ({ signal: _signal }) => {
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
