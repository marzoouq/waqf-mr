/**
 * هوكات إدارة تذاكر الدعم الفني — استعلامات + إعادة تصدير
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_REALTIME, STALE_LIVE } from '@/lib/queryStaleTime';

// إعادة تصدير من الوحدات الفرعية للتوافق مع الاستيرادات الحالية
export { useCreateTicket, useUpdateTicketStatus, useAddTicketReply, useRateTicket } from './useSupportTicketMutations';
export { useSupportStats, useSupportAnalytics, fetchTicketsForExport } from './useSupportAnalytics';
export type { SupportAnalyticsData } from './useSupportAnalytics';
export { useClientErrors } from '../audit/useClientErrors';
export type { ClientError } from '../audit/useClientErrors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  rating: number | null;
  rating_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  sender_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const TICKET_SELECT = 'id, ticket_number, title, description, category, priority, status, created_by, assigned_to, resolved_at, resolution_notes, rating, rating_comment, created_at, updated_at';

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
