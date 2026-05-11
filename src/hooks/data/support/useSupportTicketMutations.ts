/**
 * عمليات تذاكر الدعم الفني — mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { defaultNotify } from '@/lib/notify';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { supportService } from '@/lib/services/supportService';

/** إنشاء تذكرة جديدة */
export const useCreateTicket = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (ticket: { title: string; description: string; category: string; priority: string }) =>
      supportService.createTicket({ ...ticket, created_by: user?.id ?? '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      defaultNotify.success('تم إنشاء التذكرة بنجاح');
      rpc('notify_admins', {
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
    mutationFn: (input: { id: string; status: string; resolution_notes?: string; assigned_to?: string }) =>
      supportService.updateTicketStatus(input),
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
    mutationFn: ({ ticket_id, content, is_internal }: { ticket_id: string; content: string; is_internal?: boolean }) =>
      supportService.addReply({ ticket_id, content, sender_id: user?.id ?? '', is_internal }),
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
    mutationFn: (input: { id: string; rating: number; rating_comment?: string }) =>
      supportService.rateTicket(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      defaultNotify.success('شكراً لتقييمك!');
    },
    onError: () => defaultNotify.error('فشل إرسال التقييم'),
  });
};
