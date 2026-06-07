/**
 * فحوصات PWA — حالة SW، صحة manifest، أيقونات.
 */
import { getSwRefusalReason } from '@/lib/pwaBootstrap';
import type { CheckResult } from '../types';

export async function checkSwRefusalReason(): Promise<CheckResult> {
  const id = 'pwa_sw_reason';
  const reason = getSwRefusalReason();
  return reason
    ? { id, label: 'سبب رفض Service Worker', status: 'info', detail: reason }
    : { id, label: 'سبب رفض Service Worker', status: 'pass', detail: 'التسجيل مسموح' };
}

export async function checkManifestPresent(): Promise<CheckResult> {
  const id = 'pwa_manifest';
  try {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link?.href) return { id, label: 'web app manifest', status: 'fail', detail: 'وسم manifest غير موجود' };
    const res = await fetch(link.href, { cache: 'force-cache' });
    if (!res.ok) return { id, label: 'web app manifest', status: 'fail', detail: `HTTP ${res.status}` };
    const data = await res.json() as { name?: string; icons?: unknown[] };
    if (!data.name) return { id, label: 'web app manifest', status: 'warn', detail: 'name غير معرّف' };
    const icons = Array.isArray(data.icons) ? data.icons.length : 0;
    return { id, label: 'web app manifest', status: 'pass', detail: `${data.name} — ${icons} أيقونة` };
  } catch (e) {
    return { id, label: 'web app manifest', status: 'warn', detail: String(e) };
  }
}

export async function checkSwActiveRegistration(): Promise<CheckResult> {
  const id = 'pwa_sw_active';
  if (!('serviceWorker' in navigator)) {
    return { id, label: 'تسجيل SW الفعلي', status: 'info', detail: 'المتصفح لا يدعم SW' };
  }
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const ours = regs.filter((r) => (r.active?.scriptURL ?? '').includes('/sw.js'));
    if (!ours.length) return { id, label: 'تسجيل SW الفعلي', status: 'info', detail: 'لا يوجد تسجيل نشط' };
    return { id, label: 'تسجيل SW الفعلي', status: 'pass', detail: `${ours.length} تسجيل نشط` };
  } catch (e) {
    return { id, label: 'تسجيل SW الفعلي', status: 'warn', detail: String(e) };
  }
}
