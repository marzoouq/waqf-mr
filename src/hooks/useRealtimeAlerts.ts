/**
 * تنبيهات حية (Realtime) للناظر والمحاسب
 * يستمع لتغييرات على جداول support_tickets و contracts
 * وينبّه المستخدم عبر toast + إشعار في قاعدة البيانات
 */
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  expired: 'منتهي',
  cancelled: 'ملغي',
  renewed: 'مجدد',
};

export const useRealtimeAlerts = () => {
  const { user, role } = useAuth();
  const subscribedRef = useRef(false);

  useEffect(() => {
    // Only admin and accountant get realtime alerts
    if (!user || (role !== 'admin' && role !== 'accountant')) return;
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const channel = supabase
      .channel(`admin-realtime-alerts-${user.id}`)
      // 1) New support ticket
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_tickets',
      }, (payload) => {
        const ticket = payload.new as { ticket_number?: string; title?: string; priority?: string; created_by?: string };
        // Don't notify if the admin created it themselves
        if (ticket.created_by === user.id) return;
        const priorityLabel = ticket.priority === 'critical' ? '🔴 حرج' : ticket.priority === 'high' ? '🟠 عالي' : '';
        toast.info(`تذكرة دعم جديدة ${priorityLabel}`, {
          description: `${ticket.ticket_number}: ${ticket.title}`,
          action: {
            label: 'عرض',
            onClick: () => window.location.assign('/dashboard/support'),
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
              onClick: () => window.location.assign('/dashboard/contracts'),
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
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('[RealtimeAlerts] Channel error/timeout, will retry on next render');
          subscribedRef.current = false;
        }
      });

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, role]);
};
