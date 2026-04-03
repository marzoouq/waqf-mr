/**
 * عمليات تذاكر الدعم الفني — mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from './mutationNotify';
import { useAuth } from '@/hooks/auth/useAuthContext';
import type { SupportTicket } from './useSupportTickets';

/** إنشاء تذكرة جديدة */
export const useCreateTicket = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (ticket: { title: string; description: string; category: string; priority: string }) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({ ...ticket, created_by: user?.id ?? '' })
        .select()
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      defaultNotify.success('تم إنشاء التذكرة بنجاح');
      supabase.rpc('notify_admins', {
        p_title: 'تذكرة دعم فني جديدة',
        p_message: 'تم استلام تذكرة دعم فني جديدة تحتاج مراجعة',
        p_type: 'info',
        p_link: '/dashboard/support',
      }).then(() => {}, () => {});
    },
    onError: () => defaultNotify.error('فشل إنشاء التذكرة'),
  });
};

/** تحديث حالة تذكرة (للناظر) */
export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, resolution_notes, assigned_to }: {
      id: string; status: string; resolution_notes?: string; assigned_to?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (resolution_notes) updates.resolution_notes = resolution_notes;
      if (assigned_to) updates.assigned_to = assigned_to;
      if (status === 'resolved' || status === 'closed') updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('support_tickets').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      defaultNotify.success('تم تحديث التذكرة');
    },
    onError: () => defaultNotify.error('فشل تحديث التذكرة'),
  });
};

/** إضافة رد على تذكرة */
export const useAddTicketReply = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ ticket_id, content, is_internal }: {
      ticket_id: string; content: string; is_internal?: boolean;
    }) => {
      const { error } = await supabase
        .from('support_ticket_replies')
        .insert({ ticket_id, content, sender_id: user?.id ?? '', is_internal: is_internal ?? false });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ticket_replies', vars.ticket_id] });
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      defaultNotify.success('تم إرسال الرد');
    },
    onError: () => defaultNotify.error('فشل إرسال الرد'),
  });
};

/** تقييم تذكرة دعم (للمستفيد بعد الإغلاق/الحل) */
export const useRateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rating, rating_comment }: {
      id: string; rating: number; rating_comment?: string;
    }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ rating, rating_comment: rating_comment || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      defaultNotify.success('شكراً لتقييمك!');
    },
    onError: () => defaultNotify.error('فشل إرسال التقييم'),
  });
};
