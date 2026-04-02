/**
 * هوك إرسال تنبيهات التأخير — مستخرج من CollectionReport
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCollectionAlerts = () => {
  const [sendingAlerts, setSendingAlerts] = useState(false);

  const sendLatePaymentAlerts = async (overdueCount: number) => {
    if (overdueCount === 0) {
      toast.info('لا توجد دفعات متأخرة');
      return;
    }
    setSendingAlerts(true);
    try {
      const { error } = await supabase.rpc('cron_check_late_payments');
      if (error) throw error;
      toast.success(`تم إرسال تنبيهات لـ ${overdueCount} عقد متأخر`);
    } catch {
      toast.error('حدث خطأ أثناء إرسال التنبيهات');
    } finally {
      setSendingAlerts(false);
    }
  };

  return { sendingAlerts, sendLatePaymentAlerts };
};
