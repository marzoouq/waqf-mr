/**
 * تنبيهات حية (Realtime) للناظر والمحاسب
 * يستمع لتغييرات على جداول support_tickets و contracts
 * وينبّه المستخدم عبر toast + إشعار في قاعدة البيانات
 */
import { useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { useBfcacheSafeChannel } from '@/hooks/useBfcacheSafeChannel';

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  expired: 'منتهي',
  cancelled: 'ملغي',
  renewed: 'مجدد',
};

export const useRealtimeAlerts = (navigate?: (path: string) => void) => {
  const { user, role } = useAuth();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const isEnabled = !!user && (role === 'admin' || role === 'accountant');
  const userId = user?.id ?? '';

  const subscribeFn = useCallback((channel: import('@supabase/supabase-js').RealtimeChannel) => {
    channel
      // 1) New support ticket
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_tickets',
      }, (payload) => {
        const ticket = payload.new as { ticket_number?: string; title?: string; priority?: string; created_by?: string };
        if (ticket.created_by === userId) return;
        const priorityLabel = ticket.priority === 'critical' ? '🔴 حرج' : ticket.priority === 'high' ? '🟠 عالي' : '';
        toast.info(`تذكرة دعم جديدة ${priorityLabel}`, {
          description: `${ticket.ticket_number}: ${ticket.title}`,
          action: {
            label: 'عرض',
            onClick: () => navigateRef.current ? navigateRef.current('/dashboard/support') : window.location.assign('/dashboard/support'),
          },
          duration: 8000,
        });
        logger.info('[RealtimeAlerts] New support ticket:', ticket.ticket_number);
      })
      // 2) Support ticket status change
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'support_tickets',
      }, (payload) => {
        const oldT = payload.old as { status?: string };
        const newT = payload.new as { status?: string; ticket_number?: string; title?: string };
        if (oldT.status && newT.status && oldT.status !== newT.status) {
          toast.info('تحديث حالة تذكرة دعم', {
            description: `${newT.ticket_number}: ${oldT.status} ← ${newT.status}`,
            duration: 6000,
          });
        }
      })
      // 3) Contract status change
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'contracts',
      }, (payload) => {
        const oldC = payload.old as { status?: string };
        const newC = payload.new as { status?: string; contract_number?: string; tenant_name?: string };
        if (oldC.status && newC.status && oldC.status !== newC.status) {
          const oldLabel = CONTRACT_STATUS_LABELS[oldC.status] || oldC.status;
          const newLabel = CONTRACT_STATUS_LABELS[newC.status] || newC.status;
          toast.warning('تغيير حالة عقد', {
            description: `عقد ${newC.contract_number} (${newC.tenant_name}): ${oldLabel} ← ${newLabel}`,
            action: {
              label: 'عرض',
              onClick: () => navigateRef.current ? navigateRef.current('/dashboard/contracts') : window.location.assign('/dashboard/contracts'),
            },
            duration: 8000,
          });
          logger.info('[RealtimeAlerts] Contract status changed:', newC.contract_number, oldC.status, '->', newC.status);
        }
      })
      // 4) New contract
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'contracts',
      }, (payload) => {
        const c = payload.new as { contract_number?: string; tenant_name?: string };
        toast.success('عقد جديد', {
          description: `تم إضافة عقد ${c.contract_number} - ${c.tenant_name}`,
          duration: 6000,
        });
      });
  }, [userId]);

  useBfcacheSafeChannel(
    `admin-realtime-alerts-${userId}`,
    subscribeFn,
    isEnabled,
  );
};
