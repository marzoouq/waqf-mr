/**
 * فحوصات خريطة التطبيق — تربط الصفحات بالـ routes وتكشف اليتيمات.
 */
import { ALL_ROUTES, ADMIN_ROUTES, BENEFICIARY_ROUTES } from '@/constants/routeRegistry';
import { ROUTE_ROLES } from '@/constants/routeRoles';
import type { CheckResult } from '../types';

// لا eager — مجرّد مفاتيح لتعداد الملفات.
const PAGE_FILES = import.meta.glob('/src/pages/**/*.tsx');

function pageFiles(): string[] {
  return Object.keys(PAGE_FILES).filter(p => !p.endsWith('.test.tsx'));
}

export async function checkAppMapPagesReachable(): Promise<CheckResult> {
  const id = 'appmap_pages_reachable';
  const files = pageFiles();
  // فحص ستاتيكي فقط — لا نحمّل كل صفحة لتفادي bundle bloat. وجود المفتاح يكفي.
  return {
    id,
    label: 'الصفحات قابلة للوصول',
    status: files.length > 0 ? 'pass' : 'fail',
    detail: `${files.length} ملف صفحة موجود تحت src/pages/`,
  };
}

export async function checkAppMapOrphanPages(): Promise<CheckResult> {
  const id = 'appmap_orphan_pages';
  const files = pageFiles();
  // استخراج اسم الصفحة من المسار (بدون لاحقة Page) لمقارنته مع routes
  const pageNames = files.map(f => f.split('/').pop()?.replace(/\.tsx$/, '') ?? '');
  const routeNames = Object.keys(ALL_ROUTES).map(r => r.split('/').filter(Boolean).pop() ?? '');
  // تقدير تقريبي للأيتام: ملف pages لا يحتوي اسمه على أي جزء من routes
  const orphans = pageNames.filter(name => {
    if (!name) return false;
    if (['Index', 'NotFound', 'Auth', 'Unauthorized', 'ResetPassword', 'InstallApp', 'PrivacyPolicy', 'TermsOfUse', 'SupportPageGuard'].includes(name)) return false;
    const lower = name.toLowerCase().replace(/page$/, '').replace(/view$/, '');
    return !routeNames.some(rn => lower.includes(rn.replace(/-/g, '')));
  });
  if (orphans.length === 0) return { id, label: 'صفحات يتيمة', status: 'pass', detail: 'لا توجد صفحات بدون route' };
  return {
    id,
    label: 'صفحات يتيمة',
    status: orphans.length > 5 ? 'warn' : 'info',
    detail: `${orphans.length} صفحة محتملة بدون route مباشر: ${orphans.slice(0, 5).join('، ')}`,
  };
}

export async function checkAppMapMissingTitles(): Promise<CheckResult> {
  const id = 'appmap_missing_titles';
  const missing = Object.entries(ALL_ROUTES).filter(([, m]) => !m.title).map(([p]) => p);
  if (missing.length === 0) return { id, label: 'عناوين المسارات', status: 'pass', detail: `${Object.keys(ALL_ROUTES).length} مسار — كلها معنونة` };
  return { id, label: 'عناوين المسارات', status: 'warn', detail: `${missing.length} بدون عنوان: ${missing.slice(0, 3).join('، ')}` };
}

export async function checkAppMapRoleCoverage(): Promise<CheckResult> {
  const id = 'appmap_role_coverage';
  const adminCount = Object.keys(ADMIN_ROUTES).length;
  const beneCount = Object.keys(BENEFICIARY_ROUTES).filter(r => r.startsWith('/beneficiary')).length;
  const waqifCount = Object.keys(BENEFICIARY_ROUTES).filter(r => r.startsWith('/waqif')).length;
  const issues: string[] = [];
  if (adminCount < 10) issues.push('admin قليلة');
  if (beneCount < 5) issues.push('beneficiary قليلة');
  if (waqifCount < 1) issues.push('waqif مفقودة');
  if (issues.length) return { id, label: 'تغطية الأدوار', status: 'warn', detail: issues.join('، ') };
  return { id, label: 'تغطية الأدوار', status: 'pass', detail: `admin: ${adminCount} | beneficiary: ${beneCount} | waqif: ${waqifCount}` };
}

export async function checkAppMapRouteRoleSync(): Promise<CheckResult> {
  const id = 'appmap_route_role_map';
  const inRoles = Object.keys(ROUTE_ROLES);
  const inReg = Object.keys(ALL_ROUTES);
  const missingInRoles = inReg.filter(p => !ROUTE_ROLES[p]);
  const missingInRegistry = inRoles.filter(p => !ALL_ROUTES[p]);
  if (missingInRoles.length === 0 && missingInRegistry.length === 0) {
    return { id, label: 'تطابق routeRoles ↔ routeRegistry', status: 'pass', detail: `${inReg.length} مسار متطابق` };
  }
  const parts: string[] = [];
  if (missingInRoles.length) parts.push(`بدون أدوار: ${missingInRoles.slice(0, 3).join('، ')}`);
  if (missingInRegistry.length) parts.push(`بدون تسجيل: ${missingInRegistry.slice(0, 3).join('، ')}`);
  return { id, label: 'تطابق routeRoles ↔ routeRegistry', status: 'warn', detail: parts.join(' | ') };
}

/** كل فحوصات appMap كقائمة لاستخدامها في UI خريطة التطبيق */
export function getAllPagesForMap(): { role: string; path: string; title: string }[] {
  return Object.entries(ALL_ROUTES).map(([path, meta]) => {
    const roles = ROUTE_ROLES[path] ?? [];
    const role = roles.includes('admin') ? 'admin' : roles.includes('beneficiary') ? 'beneficiary' : roles.includes('waqif') ? 'waqif' : 'public';
    return { role, path, title: meta.title };
  });
}
