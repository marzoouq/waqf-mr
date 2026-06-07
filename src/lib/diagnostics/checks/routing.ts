/**
 * فحوصات التوجيه — تتأكد من صحة سجلّ المسارات وقابليتها للتحميل.
 */
import { ALL_ROUTES } from '@/constants/routeRegistry';
import type { CheckResult } from '../types';

export async function checkRoutesRegistryConsistency(): Promise<CheckResult> {
  const id = 'routing_registry';
  try {
    const routes = ALL_ROUTES ?? [];
    if (!routes.length) {
      return { id, label: 'سجل المسارات', status: 'fail', detail: 'سجل المسارات فارغ' };
    }
    const dupes = new Set<string>();
    const seen = new Set<string>();
    for (const r of routes) {
      const path = typeof r === 'string' ? r : (r as { path?: string })?.path ?? '';
      if (!path) continue;
      if (seen.has(path)) dupes.add(path);
      seen.add(path);
    }
    if (dupes.size) {
      return { id, label: 'سجل المسارات', status: 'warn', detail: `مسارات مكررة: ${[...dupes].join(', ')}` };
    }
    return { id, label: 'سجل المسارات', status: 'pass', detail: `${seen.size} مسار مسجَّل` };
  } catch (e) {
    return { id, label: 'سجل المسارات', status: 'fail', detail: String(e) };
  }
}

export async function checkCurrentRouteResolved(): Promise<CheckResult> {
  const id = 'routing_current';
  try {
    const path = window.location.pathname;
    const found = (ALL_ROUTES ?? []).some((r) => {
      const p = typeof r === 'string' ? r : (r as { path?: string })?.path ?? '';
      if (!p) return false;
      // basic match: exact أو prefix لمسارات ديناميكية
      return p === path || (p.includes(':') && path.startsWith(p.split(':')[0]));
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
