/**
 * فحوصات التوجيه — تتأكد من صحة سجلّ المسارات وقابليتها للتحميل.
 */
import { ALL_ROUTES } from '@/constants/routeRegistry';
import type { CheckResult } from '../types';

export async function checkRoutesRegistryConsistency(): Promise<CheckResult> {
  const id = 'routing_registry';
  try {
    const paths = Object.keys(ALL_ROUTES ?? {});
    if (!paths.length) {
      return { id, label: 'سجل المسارات', status: 'fail', detail: 'سجل المسارات فارغ' };
    }
    const missingTitle = paths.filter((p) => !ALL_ROUTES[p]?.title);
    if (missingTitle.length) {
      return { id, label: 'سجل المسارات', status: 'warn', detail: `بدون عنوان: ${missingTitle.slice(0, 3).join(', ')}` };
    }
    return { id, label: 'سجل المسارات', status: 'pass', detail: `${paths.length} مسار مسجَّل` };
  } catch (e) {
    return { id, label: 'سجل المسارات', status: 'fail', detail: String(e) };
  }
}

export async function checkCurrentRouteResolved(): Promise<CheckResult> {
  const id = 'routing_current';
  try {
    const path = window.location.pathname;
    const found = Object.keys(ALL_ROUTES ?? {}).some((p) => {
      if (p === path) return true;
      if (p.includes(':')) {
        const prefix = p.split(':')[0] ?? '';
        return prefix.length > 1 && path.startsWith(prefix);
      }
      return false;
    });
    return found
      ? { id, label: 'المسار الحالي', status: 'pass', detail: path }
      : { id, label: 'المسار الحالي', status: 'info', detail: `${path} (غير موجود في السجل)` };
  } catch (e) {
    return { id, label: 'المسار الحالي', status: 'warn', detail: String(e) };
  }
}

export async function checkNoBrokenChunkRetries(): Promise<CheckResult> {
  const id = 'routing_chunk_retries';
  try {
    const raw = sessionStorage.getItem('chunk_retry');
    if (!raw) return { id, label: 'إعادة تحميل الـ chunks', status: 'pass', detail: 'لا يوجد retries' };
    const count = parseInt(raw, 10) || 0;
    if (count >= 3) return { id, label: 'إعادة تحميل الـ chunks', status: 'warn', detail: `${count} محاولات — قد توجد chunks مفقودة` };
    return { id, label: 'إعادة تحميل الـ chunks', status: 'info', detail: `${count} محاولة` };
  } catch (e) {
    return { id, label: 'إعادة تحميل الـ chunks', status: 'warn', detail: String(e) };
  }
}
