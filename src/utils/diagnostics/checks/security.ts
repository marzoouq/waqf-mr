/**
 * بطاقة 5 — فحوصات الأمان والصلاحيات (4)
 */
import type { CheckResult } from '../types';

export async function checkCryptoAPI(): Promise<CheckResult> {
  const id = 'sec_crypto';
  const supported = typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
  return { id, label: 'Web Crypto API', status: supported ? 'pass' : 'warn', detail: supported ? 'مدعوم' : 'غير مدعوم — قد يؤثر على التشفير' };
}

export async function checkNotificationPermission(): Promise<CheckResult> {
  const id = 'sec_notification';
  if (!('Notification' in window)) return { id, label: 'إذن الإشعارات', status: 'info', detail: 'غير مدعوم' };
  return { id, label: 'إذن الإشعارات', status: Notification.permission === 'granted' ? 'pass' : 'info', detail: `الحالة: ${Notification.permission}` };
}

export async function checkClipboardAPI(): Promise<CheckResult> {
  const id = 'sec_clipboard';
  const supported = navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
  return { id, label: 'Clipboard API', status: supported ? 'pass' : 'info', detail: supported ? 'مدعوم' : 'غير مدعوم' };
}

export async function checkWindowOnError(): Promise<CheckResult> {
  const id = 'sec_onerror';
  const hasHandler = typeof window.onerror === 'function';
  return { id, label: 'معالج الأخطاء العام', status: 'info', detail: hasHandler ? 'window.onerror مضبوط' : 'لا يوجد window.onerror — ErrorBoundary يكفي' };
}
