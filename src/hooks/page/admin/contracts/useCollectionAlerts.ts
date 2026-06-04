/**
 * Page hook لإرسال تنبيهات تأخير التحصيل — يحتوي UI state و toasts.
 * نُقل من hooks/data/contracts لأنه ليس data hook نقي.
 */
import { useState } from 'react';
import { rpc } from '@/lib/api/rpc';
import { uiNotify } from '@/lib/notify';

export const useCollectionAlerts = () => {
  const [sendingAlerts, setSendingAlerts] = useState(false);

  const sendLatePaymentAlerts = async (overdueCount: number) => {
    if (overdueCount === 0) {
      uiNotify.info('لا توجد دفعات متأخرة');
      return;
    }
    setSendingAlerts(true);
    try {
      await rpc('cron_check_late_payments');
      uiNotify.success(`تم إرسال تنبيهات لـ ${overdueCount} عقد متأخر`);
    } catch {
      uiNotify.error('حدث خطأ أثناء إرسال التنبيهات');
    } finally {
      setSendingAlerts(false);
    }
  };

  return { sendingAlerts, sendLatePaymentAlerts };
};
