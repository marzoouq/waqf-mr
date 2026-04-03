/**
 * بطاقة 6 — فحوصات إعدادات التطبيق (3)
 */
import { allAdminLinks, allBeneficiaryLinks, ROUTE_TITLES } from '@/components/layout';
import type { CheckResult } from '../types';

export async function checkEnvVariables(): Promise<CheckResult> {
  const id = 'app_env';
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { id, label: 'متغيرات البيئة', status: 'fail', detail: 'مفقودة: VITE_SUPABASE_URL أو PUBLISHABLE_KEY' };
  return { id, label: 'متغيرات البيئة', status: 'pass', detail: 'SUPABASE_URL و PUBLISHABLE_KEY موجودان' };
}

export async function checkRegisteredRoutes(): Promise<CheckResult> {
  const id = 'app_routes';
  const allLinks = [...allAdminLinks, ...allBeneficiaryLinks];
  const missing = allLinks
    .map(l => l.to)
    .filter(path => !ROUTE_TITLES[path]);

  if (missing.length > 0) {
    return { id, label: 'تطابق المسارات', status: 'warn', detail: `${missing.length} مسار بدون عنوان: ${missing.slice(0, 3).join('، ')}` };
  }
  return { id, label: 'تطابق المسارات', status: 'pass', detail: `${allLinks.length} رابط مسجّل — الكل متطابق مع ROUTE_TITLES` };
}

export async function checkOnlineStatus(): Promise<CheckResult> {
  const id = 'app_online';
  return { id, label: 'حالة الاتصال', status: navigator.onLine ? 'pass' : 'warn', detail: navigator.onLine ? 'متصل بالإنترنت' : 'غير متصل' };
}
