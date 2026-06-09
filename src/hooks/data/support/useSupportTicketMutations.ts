/**
 * عمليات تذاكر الدعم الفني — mutations (طبقة بيانات نقية، لا توست هنا).
 * الإشعارات تُضاف من طبقة الصفحة/المكوّن عبر `mutate(vars, { onSuccess, onError })`.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { supportService } from '@/lib/services/supportService';
import { supportKeys } from '@/lib/queryKeys/supportKeys';

/** إنشاء تذكرة جديدة */
export const useCreateTicket = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (ticket: { title: string; description: string; category: string; priority: string }) =>
      supportService.createTicket({ ...ticket, created_by: user?.id ?? '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.tickets.prefix });
      rpc('notify_admins', {
        p_title: 'تذكرة دعم فني جديدة',
        p_message: 'تم استلام تذكرة دعم فني جديدة تحتاج مراجعة',
        p_type: 'info',
        p_link: '/dashboard/support',
      }).then(() => {}, () => {});
    },
  });
};

/** تحديث حالة تذكرة (للناظر) */
export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: string; resolution_notes?: string; assigned_to?: string }) =>
      supportService.updateTicketStatus(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.tickets.prefix });
    },
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
      qc.invalidateQueries({ queryKey: supportKeys.replies.byTicket(vars.ticket_id) });
      qc.invalidateQueries({ queryKey: supportKeys.tickets.prefix });
    },
  });
};

/** تقييم تذكرة دعم (للمستفيد بعد الإغلاق/الحل) */
export const useRateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; rating: number; rating_comment?: string }) =>
      supportService.rateTicket(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.tickets.prefix });
    },
  });
};
