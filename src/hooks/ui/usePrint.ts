/**
 * هوك طباعة موحّد — يُوحّد استدعاء window.print() في كل المشروع
 * يُضيف إشعار + تأخير اختياري قبل الطباعة
 */
import { useCallback } from 'react';
import { defaultNotify } from '@/lib/notify';

interface UsePrintOptions {
  /** رسالة الإشعار قبل الطباعة */
  message?: string;
  /** تأخير بالمللي ثانية قبل استدعاء print — افتراضي 300 */
  delay?: number;
}

export function usePrint(options: UsePrintOptions = {}) {
  const { message = 'جاري تجهيز الطباعة...', delay = 300 } = options;

  const print = useCallback(() => {
    defaultNotify.info(message);
    setTimeout(() => {
      window.print();
    }, delay);
  }, [message, delay]);

  return print;
}
