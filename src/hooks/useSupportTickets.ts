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

/** جلب التذاكر مع server-side pagination */
export const useSupportTickets = (statusFilter?: string, page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['support_tickets', statusFilter ?? 'all', page, pageSize],
    staleTime: 10_000,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('support_tickets')
        .select('*', { count: 'exact' })
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
    staleTime: 5_000,
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true })
        .limit(500); // Ticket replies rarely exceed this; prevents unbounded fetch
      if (error) throw error;
      return (data ?? []) as TicketReply[];
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
        .from('support_tickets')
        .insert({ ...ticket, created_by: user?.id ?? '' })
        .select()
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      toast.success('تم إنشاء التذكرة بنجاح');
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
      const { error } = await supabase.from('support_tickets').update(updates).eq('id', id);
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
        .from('support_ticket_replies')
        .insert({ ticket_id, content, sender_id: user?.id ?? '', is_internal: is_internal ?? false });
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
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [totalRes, openRes, inProgressRes, resolvedRes, highRes, tickets7dRes, errorsRes, errors24hRes, errors7dRes] = await Promise.all([
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'closed']),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('priority', ['high', 'critical']),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).gte('created_at', last7d),
        supabase.from('access_log').select('*', { count: 'exact', head: true }).eq('event_type', 'client_error'),
        supabase.from('access_log').select('*', { count: 'exact', head: true }).eq('event_type', 'client_error').gte('created_at', last24h),
        supabase.from('access_log').select('*', { count: 'exact', head: true }).eq('event_type', 'client_error').gte('created_at', last7d),
      ]);

      return {
        totalTickets: totalRes.count ?? 0,
        openTickets: openRes.count ?? 0,
        inProgressTickets: inProgressRes.count ?? 0,
        resolvedTickets: resolvedRes.count ?? 0,
        highPriorityTickets: highRes.count ?? 0,
        totalErrors: errorsRes.count ?? 0,
        errorsLast24h: errors24hRes.count ?? 0,
        errorsLast7d: errors7dRes.count ?? 0,
        ticketsLast7d: tickets7dRes.count ?? 0,
      };
    },
  });
};
