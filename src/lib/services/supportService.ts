/**
 * supportService — عمليات تذاكر الدعم الفني وردودها.
 * مستخرج من useSupportTicketMutations.ts ضمن M2.4.
 */
import { supabase } from '@/integrations/supabase/client';
import type { SupportTicket } from '@/hooks/data/support/useSupportTickets';

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
    const updates: {
      status: string;
      resolution_notes?: string;
      assigned_to?: string;
      resolved_at?: string;
    } = { status: input.status };
    if (input.resolution_notes) updates.resolution_notes = input.resolution_notes;
    if (input.assigned_to) updates.assigned_to = input.assigned_to;
    if (input.status === 'resolved' || input.status === 'closed') {
      updates.resolved_at = new Date().toISOString();
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
    const { error } = await supabase
      .from('support_tickets')
      .update({ rating: input.rating, rating_comment: input.rating_comment || null })
      .eq('id', input.id);
    if (error) throw error;
  },
};
