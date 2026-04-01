/**
 * استعلامات ردود تذاكر الدعم — مفصول من useSupportTickets
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_LIVE } from '@/lib/queryStaleTime';
import type { TicketReply } from './supportTypes';

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
