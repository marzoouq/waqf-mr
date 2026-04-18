/**
 * بطاقة 6 — فحوصات إعدادات التطبيق
 */
import { allAdminLinks, allBeneficiaryLinks, ROUTE_TITLES } from '@/constants/navigation';
import { ALL_ROUTES } from '@/constants/routeRegistry';
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

  // فحصان: (1) المسار له عنوان، (2) المسار مُسجَّل فعلياً في routeRegistry
  const missingTitles = allLinks.map(l => l.to).filter(path => !ROUTE_TITLES[path]);
  const missingInRegistry = allLinks.map(l => l.to).filter(path => !ALL_ROUTES[path]);

  if (missingInRegistry.length > 0) {
    return {
      id,
      label: 'تطابق المسارات',
      status: 'fail',
      detail: `${missingInRegistry.length} مسار غير مُسجَّل في routeRegistry: ${missingInRegistry.slice(0, 3).join('، ')}`,
    };
  }
  if (missingTitles.length > 0) {
    return {
      id,
      label: 'تطابق المسارات',
      status: 'warn',
      detail: `${missingTitles.length} مسار بدون عنوان: ${missingTitles.slice(0, 3).join('، ')}`,
    };
  }
  return { id, label: 'تطابق المسارات', status: 'pass', detail: `${allLinks.length} رابط — كلها مُسجَّلة في routeRegistry ولها عناوين` };
}

export async function checkOnlineStatus(): Promise<CheckResult> {
  const id = 'app_online';
  return { id, label: 'حالة الاتصال', status: navigator.onLine ? 'pass' : 'warn', detail: navigator.onLine ? 'متصل بالإنترنت' : 'غير متصل' };
}
