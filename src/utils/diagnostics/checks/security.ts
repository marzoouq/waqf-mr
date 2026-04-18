/**
 * بطاقة 5 — فحوصات الأمان والصلاحيات
 * تم تنظيفها: حذف checkCryptoAPI (دائماً pass) و checkWindowOnError (دائماً info)
 */
import type { CheckResult } from '../types';

export async function checkNotificationPermission(): Promise<CheckResult> {
  const id = 'sec_notification';
  if (!('Notification' in window)) {
    return { id, label: 'إذن الإشعارات', status: 'info', detail: 'غير مدعوم في هذا المتصفح' };
  }
  const perm = Notification.permission;
  if (perm === 'granted') {
    return { id, label: 'إذن الإشعارات', status: 'pass', detail: 'ممنوح — الإشعارات تعمل' };
  }
  if (perm === 'denied') {
    return { id, label: 'إذن الإشعارات', status: 'warn', detail: 'مرفوض — لن تصل الإشعارات الفورية' };
  }
  return { id, label: 'إذن الإشعارات', status: 'info', detail: 'لم يُطلب الإذن بعد' };
}

export async function checkClipboardAPI(): Promise<CheckResult> {
  const id = 'sec_clipboard';
  const supported = navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
  return { id, label: 'Clipboard API', status: supported ? 'pass' : 'info', detail: supported ? 'مدعوم' : 'غير مدعوم' };
}
