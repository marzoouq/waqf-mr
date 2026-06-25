/**
 * supportService — عمليات تذاكر الدعم الفني وردودها.
 * مستخرج من useSupportTicketMutations.ts ضمن M2.4.
 */
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';
import type { Database } from '@/integrations/supabase/types';
import type { SupportTicket } from '@/types/support';

type SupportTicketUpdate = Database['public']['Tables']['support_tickets']['Update'];

export const supportService = {
  async createTicket(payload: {
    title: string;
    description: string;
    category: string;
    priority: string;
    created_by: string;
  }): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as SupportTicket;
  },

  async updateTicketStatus(input: {
    id: string;
    status: string;
    resolution_notes?: string;
    assigned_to?: string;
  }): Promise<void> {
    const updates: SupportTicketUpdate = { status: input.status };
    if (input.resolution_notes) updates.resolution_notes = input.resolution_notes;
    if (input.assigned_to) updates.assigned_to = input.assigned_to;
    if (input.status === 'resolved' || input.status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    } else {
      // F8: عند إعادة فتح التذكرة، تصفير resolved_at
      (updates as Record<string, unknown>).resolved_at = null;
    }
    const { error } = await supabase.from('support_tickets').update(updates).eq('id', input.id);
    if (error) throw error;
  },

  async addReply(payload: {
    ticket_id: string;
    content: string;
    sender_id: string;
    is_internal?: boolean;
  }): Promise<void> {
    const { error } = await supabase.from('support_ticket_replies').insert({
      ticket_id: payload.ticket_id,
      content: payload.content,
      sender_id: payload.sender_id,
      is_internal: payload.is_internal ?? false,
    });
    if (error) throw error;
  },

  async rateTicket(input: { id: string; rating: number; rating_comment?: string }): Promise<void> {
    // F2: استخدام RPC آمنة بدل تحديث مباشر يفشل بصمت بسبب RLS
    await rpc('rate_support_ticket', {
      p_id: input.id,
      p_rating: input.rating,
      p_comment: input.rating_comment || undefined,
    });
  },
};
