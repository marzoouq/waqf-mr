/**
 * هوكات إدارة تذاكر الدعم الفني — استعلامات + إعادة تصدير
 */
import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useBfcacheSafeChannel } from '@/lib/realtime/bfcacheSafeChannel';
import { useStableRef } from '@/lib/hooks/useStableRef';
import { rpc } from '@/lib/api/rpc';
import { logger } from '@/lib/logger';
import { notificationsKeys } from '@/lib/queryKeys/notificationsKeys';
import { supabase } from '@/integrations/supabase/client';
import { STALE_REALTIME, STALE_LIVE } from '@/lib/queryStaleTime';
import { supportKeys } from '@/lib/queryKeys/supportKeys';

// إعادة تصدير من الوحدات الفرعية للتوافق مع الاستيرادات الحالية
export { useCreateTicket, useUpdateTicketStatus, useAddTicketReply, useRateTicket, useOwnerTicketAction } from './useSupportTicketMutations';
export { useSupportStats, useSupportAnalytics, fetchTicketsForExport } from './useSupportAnalytics';
export type { SupportAnalyticsData } from './useSupportAnalytics';
export { useClientErrors } from '../audit/useClientErrors';
export type { ClientError } from '../audit/useClientErrors';

// ---------------------------------------------------------------------------
// Types — مُعرَّفة في src/types/support.ts (مصدر وحيد للحقيقة)
// تُعاد التصدير هنا للحفاظ على التوافق مع الاستيرادات الحالية.
// ---------------------------------------------------------------------------

export type { SupportTicket, TicketReply } from '@/types/support';
import type { SupportTicket, TicketReply, TicketEvent } from '@/types/support';
export type { TicketEvent } from '@/types/support';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const TICKET_SELECT = 'id, ticket_number, title, description, category, priority, status, created_by, assigned_to, resolved_at, resolution_notes, rating, rating_comment, created_at, updated_at';

/** جلب التذاكر مع server-side pagination */
export const useSupportTickets = (statusFilter?: string, page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: supportKeys.tickets.list(statusFilter, page, pageSize),
    staleTime: STALE_REALTIME,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('support_tickets')
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
    queryFn: async () => {
      const { data, error } = await supabase.from('support_ticket_replies')
        .select('id, ticket_id, sender_id, content, is_internal, created_at')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as TicketReply[];
    },
  });
};

/**
 * بث حي لتذكرة واحدة: الردود والأحداث وحالة التذكرة،
 * مع تعليم إشعاراتها كمقروءة عند الفتح.
 */
export const useTicketLive = (ticketId?: string) => {
  const queryClientRef = useStableRef(useQueryClient());

  const subscribeFn = useCallback((channel: RealtimeChannel) => {
    const qc = queryClientRef.current;
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_ticket_replies', filter: `ticket_id=eq.${ticketId}` }, () => {
        qc.invalidateQueries({ queryKey: supportKeys.replies.byTicket(ticketId) });
        qc.invalidateQueries({ queryKey: supportKeys.replyRoles.byTicket(ticketId) });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_ticket_events', filter: `ticket_id=eq.${ticketId}` }, () => {
        qc.invalidateQueries({ queryKey: supportKeys.events.byTicket(ticketId) });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticketId}` }, () => {
        qc.invalidateQueries({ queryKey: supportKeys.tickets.prefix });
      });
  }, [queryClientRef, ticketId]);

  useBfcacheSafeChannel(`ticket-live-${ticketId ?? 'none'}`, subscribeFn, !!ticketId);

  useEffect(() => {
    if (!ticketId) return;
    rpc('mark_ticket_notifications_read', { p_ticket_id: ticketId })
      .then(() => queryClientRef.current.invalidateQueries({ queryKey: notificationsKeys.prefix }))
      .catch((err: unknown) => logger.error('mark_ticket_notifications_read failed:', err));
  }, [ticketId, queryClientRef]);
};

/** أدوار مرسلي الردود (الدور فقط) */
export const useTicketReplyRoles = (ticketId?: string) => useQuery({
  queryKey: supportKeys.replyRoles.byTicket(ticketId),
  enabled: !!ticketId,
  staleTime: STALE_LIVE,
  queryFn: async ({ signal }) => {
    const rows = await rpc('get_ticket_reply_roles', { p_ticket_id: ticketId! }, { signal });
    const map: Record<string, string> = {};
    for (const r of (rows ?? []) as { sender_id: string; role: string | null }[]) map[r.sender_id] = r.role ?? 'beneficiary';
    return map;
  },
});

/** سجل أحداث التذكرة (الخط الزمني) */
export const useTicketEvents = (ticketId?: string) => useQuery({
  queryKey: supportKeys.events.byTicket(ticketId),
  enabled: !!ticketId,
  staleTime: STALE_LIVE,
  queryFn: async () => {
    const { data, error } = await supabase.from('support_ticket_events')
      .select('id, ticket_id, event_type, from_status, to_status, actor_id, note, created_at')
      .eq('ticket_id', ticketId!)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as TicketEvent[];
  },
});

/** أحدث نسخة من التذكرة (تتحدّث مع البث الحي) — تبدأ بالنسخة الممرّرة */
export const useLiveTicket = (ticket: SupportTicket) => {
  const { data } = useQuery({
    queryKey: [...supportKeys.tickets.prefix, 'one', ticket.id],
    staleTime: STALE_LIVE,
    initialData: ticket,
    queryFn: async () => {
      const { data: row, error } = await supabase.from('support_tickets').select(TICKET_SELECT).eq('id', ticket.id).single();
      if (error) throw error;
      return row as SupportTicket;
    },
  });
  return data ?? ticket;
};

/** كل ما تحتاجه نافذة التذكرة: أحدث نسخة + ردود + أدوار + خط زمني + بث حي */
export const useTicketConversation = (initial: SupportTicket) => {
  const ticket = useLiveTicket(initial);
  const replies = useTicketReplies(initial.id);
  const roles = useTicketReplyRoles(initial.id);
  const events = useTicketEvents(initial.id);
  useTicketLive(initial.id);
  return {
    ticket,
    replies: replies.data ?? [],
    senderRoles: roles.data ?? {},
    events: events.data ?? [],
    isLoading: replies.isLoading,
  };
};
