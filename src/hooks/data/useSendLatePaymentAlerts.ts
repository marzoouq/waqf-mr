/**
 * هوك لإرسال تنبيهات الدفعات المتأخرة
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSendLatePaymentAlerts() {
  const [sending, setSending] = useState(false);

  const sendAlerts = async (overdueCount: number) => {
    if (overdueCount === 0) {
      toast.info('لا توجد دفعات متأخرة');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.rpc('cron_check_late_payments');
      if (error) throw error;
      toast.success(`تم إرسال تنبيهات لـ ${overdueCount} عقد متأخر`);
    } catch {
      toast.error('حدث خطأ أثناء إرسال التنبيهات');
    } finally {
      setSending(false);
    }
  };

  return { sendAlerts, sending };
}
