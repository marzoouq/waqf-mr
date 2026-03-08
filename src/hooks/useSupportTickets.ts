/**
 * هوكات إدارة تذاكر الدعم الفني
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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

export interface ClientError {
  id: string;
  event_type: string;
  target_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
  email: string | null;
}

/** جلب جميع التذاكر (للناظر) أو تذاكر المستخدم */
export const useSupportTickets = (statusFilter?: string) => {
  return useQuery({
    queryKey: ['support_tickets', statusFilter ?? 'all'],
    staleTime: 10_000,
    queryFn: async () => {
      let query = supabase
        .from('support_tickets' as string)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as SupportTicket[];
    },
  });
};

/** جلب ردود تذكرة */
export const useTicketReplies = (ticketId?: string) => {
  return useQuery({
    queryKey: ['ticket_replies', ticketId],
    staleTime: 5_000,
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_ticket_replies' as string)
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as TicketReply[];
    },
  });
};

/** إنشاء تذكرة جديدة */
export const useCreateTicket = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (ticket: { title: string; description: string; category: string; priority: string }) => {
      const { data, error } = await supabase
        .from('support_tickets' as string)
        .insert({ ...ticket, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SupportTicket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      toast.success('تم إنشاء التذكرة بنجاح');

      // إشعار الناظر
      supabase.rpc('notify_admins', {
        p_title: 'تذكرة دعم فني جديدة',
        p_message: 'تم استلام تذكرة دعم فني جديدة تحتاج مراجعة',
        p_type: 'info',
        p_link: '/dashboard/support',
      }).then(() => {}, () => {});
    },
    onError: () => toast.error('فشل إنشاء التذكرة'),
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
      const { error } = await supabase
        .from('support_tickets' as string)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      toast.success('تم تحديث التذكرة');
    },
    onError: () => toast.error('فشل تحديث التذكرة'),
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
        .from('support_ticket_replies' as string)
        .insert({ ticket_id, content, sender_id: user?.id, is_internal: is_internal ?? false });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ticket_replies', vars.ticket_id] });
      toast.success('تم إرسال الرد');
    },
    onError: () => toast.error('فشل إرسال الرد'),
  });
};

/** جلب أخطاء التطبيق من سجل الوصول */
export const useClientErrors = () => {
  return useQuery({
    queryKey: ['client_errors'],
    staleTime: 30_000,
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

/** إحصائيات الدعم الفني */
export const useSupportStats = () => {
  return useQuery({
    queryKey: ['support_stats'],
    staleTime: 30_000,
    queryFn: async () => {
      const [ticketsRes, errorsRes] = await Promise.all([
        supabase.from('support_tickets' as string).select('status, priority, created_at').limit(500),
        supabase.from('access_log').select('id, created_at').eq('event_type', 'client_error').limit(500),
      ]);
      const tickets = (ticketsRes.data ?? []) as Array<{ status: string; priority: string; created_at: string }>;
      const errors = (errorsRes.data ?? []) as Array<{ id: string; created_at: string }>;

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      return {
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open').length,
        inProgressTickets: tickets.filter(t => t.status === 'in_progress').length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        highPriorityTickets: tickets.filter(t => t.priority === 'high' || t.priority === 'critical').length,
        totalErrors: errors.length,
        errorsLast24h: errors.filter(e => new Date(e.created_at) > last24h).length,
        errorsLast7d: errors.filter(e => new Date(e.created_at) > last7d).length,
        ticketsLast7d: tickets.filter(t => new Date(t.created_at) > last7d).length,
      };
    },
  });
};
