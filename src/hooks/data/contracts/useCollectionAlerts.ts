/**
 * هوك إرسال تنبيهات التأخير
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';

export const useCollectionAlerts = () => {
  const [sendingAlerts, setSendingAlerts] = useState(false);

  const sendLatePaymentAlerts = async (overdueCount: number) => {
    if (overdueCount === 0) {
      defaultNotify.info('لا توجد دفعات متأخرة');
      return;
    }
    setSendingAlerts(true);
    try {
      const { error } = await supabase.rpc('cron_check_late_payments');
      if (error) throw error;
      defaultNotify.success(`تم إرسال تنبيهات لـ ${overdueCount} عقد متأخر`);
    } catch {
      defaultNotify.error('حدث خطأ أثناء إرسال التنبيهات');
    } finally {
      setSendingAlerts(false);
    }
  };

  return { sendingAlerts, sendLatePaymentAlerts };
};
