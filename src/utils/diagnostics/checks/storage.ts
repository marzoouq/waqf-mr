/**
 * بطاقة 3 — فحوصات التخزين (6)
 */
import type { CheckResult } from '../types';

export async function checkLocalStorage(): Promise<CheckResult> {
  const id = 'storage_local';
  try {
    const keys = Object.keys(localStorage);
    const totalBytes = keys.reduce((sum, k) => sum + (localStorage.getItem(k)?.length ?? 0), 0);
    const kb = Math.round(totalBytes / 1024);
    return { id, label: 'localStorage', status: kb > 4000 ? 'warn' : 'pass', detail: `${keys.length} مفتاح — ${kb} KB` };
  } catch {
    return { id, label: 'localStorage', status: 'fail', detail: 'غير متاح' };
  }
}

export async function checkSessionStorage(): Promise<CheckResult> {
  const id = 'storage_session';
  try {
    const keys = Object.keys(sessionStorage);
    return { id, label: 'sessionStorage', status: 'pass', detail: `${keys.length} مفتاح` };
  } catch {
    return { id, label: 'sessionStorage', status: 'fail', detail: 'غير متاح' };
  }
}

export async function checkIndexedDB(): Promise<CheckResult> {
  const id = 'storage_idb';
  try {
    const dbs = await indexedDB.databases();
    return { id, label: 'IndexedDB', status: 'pass', detail: `${dbs.length} قاعدة بيانات` };
  } catch {
    return { id, label: 'IndexedDB', status: 'info', detail: 'غير متاح أو محظور' };
  }
}

export async function checkServiceWorker(): Promise<CheckResult> {
  const id = 'storage_sw';
  if (!('serviceWorker' in navigator)) return { id, label: 'Service Worker', status: 'info', detail: 'غير مدعوم' };
  const regs = await navigator.serviceWorker.getRegistrations();
  return { id, label: 'Service Worker', status: regs.length > 0 ? 'pass' : 'info', detail: `${regs.length} مسجّل` };
}

export async function checkErrorLogQueue(): Promise<CheckResult> {
  const id = 'storage_errorlog';
  try {
    const raw = localStorage.getItem('error_log_queue');
    if (!raw) return { id, label: 'طابور الأخطاء', status: 'pass', detail: 'فارغ — لا أخطاء معلّقة' };
    let queue = JSON.parse(raw);
    if (!Array.isArray(queue)) queue = [];

    // تنظيف تلقائي: حذف السجلات الأقدم من 24 ساعة + أخطاء اختبارات الوحدة
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = queue.filter((entry: { logged_at?: string; error_message?: string; timestamp?: string }) => {
      const ts = entry.logged_at || entry.timestamp;
      if (ts && new Date(ts).getTime() < cutoff) return false;
      if (entry.error_message === 'Test explosion') return false;
      return true;
    });

    // حفظ القائمة المنظّفة
    if (filtered.length !== queue.length) {
      localStorage.setItem('error_log_queue', JSON.stringify(filtered));
    }

    const count = filtered.length;
    return { id, label: 'طابور الأخطاء', status: count > 0 ? 'warn' : 'pass', detail: count > 0 ? `${count} خطأ معلّق` : 'فارغ — لا أخطاء معلّقة' };
  } catch {
    return { id, label: 'طابور الأخطاء', status: 'info', detail: 'تعذر القراءة' };
  }
}

export async function checkStorageIntegrity(): Promise<CheckResult> {
  const id = 'storage_integrity';
  try {
    const testKey = '__diag_test__';
    localStorage.setItem(testKey, '1');
    const val = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return { id, label: 'سلامة التخزين', status: val === '1' ? 'pass' : 'fail', detail: val === '1' ? 'القراءة/الكتابة تعمل' : 'فشل التحقق' };
  } catch {
    return { id, label: 'سلامة التخزين', status: 'fail', detail: 'تعذر الكتابة' };
  }
}
