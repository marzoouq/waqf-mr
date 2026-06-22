/**
 * Nav links ↔ routes parity — D-06
 *
 * يضمن:
 *  1. كل to في allAdminLinks موجود فعلًا كـ Route في adminRoutes.tsx
 *     (باستثناء /beneficiary المُدرج عمدًا كرابط معاينة للناظر).
 *  2. كل route في adminRoutes.tsx يملك label في allAdminLinks
 *     (لا route خفي بدون رابط في الـ sidebar).
 *  3. كل route تحت /dashboard/* (عدا /dashboard نفسه) يملك entry في ADMIN_ROUTE_GROUPS
 *     أو مبرّر صراحة كـ ungrouped.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { allAdminLinks, ADMIN_ROUTE_GROUPS } from '@/constants/navigation';

const ROOT = process.cwd();
const ROUTES_FILE = resolve(ROOT, 'src/routes/adminRoutes.tsx');

/** يستخرج كل المسارات المسجّلة في adminRoutes.tsx */
const extractRegisteredRoutes = (): string[] => {
  const content = readFileSync(ROUTES_FILE, 'utf8');
  const matches = Array.from(content.matchAll(/path="(\/dashboard[^"]*)"/g));
  return matches.map((m) => m[1]).filter((s): s is string => Boolean(s));
};

/** المسارات المُدرجة عمدًا في allAdminLinks دون أن تكون Route — موثّقة كروابط معاينة. */
const PREVIEW_LINKS = new Set<string>(['/beneficiary']);

/** المسارات المُسجّلة كـ Route لكنها لا تظهر في sidebar (مبرّرة).
 *  P1/C3: تقارير التدقيق الجنائي والتنظيف نُقلت إلى أزرار داخل /dashboard/audit-log. */
const HIDDEN_ROUTES = new Set<string>([
  '/dashboard/audit-report-final',
  '/dashboard/cleanup-report',
]);

/** المسارات التي لا تنتمي لأي group في ADMIN_ROUTE_GROUPS (مبرّرة كـ ungrouped). */
const UNGROUPED_ROUTES = new Set<string>(['/dashboard', '/dashboard/comparison']);

describe('Nav links ↔ adminRoutes parity (D-06)', () => {
  const registered = extractRegisteredRoutes();

  it.each(allAdminLinks.filter((l) => !PREVIEW_LINKS.has(l.to)).map((l) => l.to))(
    'allAdminLinks: %s مُسجّل كـ Route في adminRoutes.tsx',
    (to) => {
      expect(registered, `الرابط ${to} في allAdminLinks لكن لا يوجد Route مقابل`).toContain(to);
    },
  );

  it.each(registered.filter((r) => !HIDDEN_ROUTES.has(r)))(
    'adminRoutes: %s يملك label في allAdminLinks (لا route خفي)',
    (route) => {
      const found = allAdminLinks.some((l) => l.to === route);
      expect(found, `Route ${route} مسجّل لكن لا يوجد له entry في allAdminLinks`).toBe(true);
    },
  );

  it.each(registered.filter((r) => !UNGROUPED_ROUTES.has(r) && !HIDDEN_ROUTES.has(r)))(
    'ADMIN_ROUTE_GROUPS: %s له group مُعيَّن',
    (route) => {
      expect(ADMIN_ROUTE_GROUPS[route], `Route ${route} بلا group في ADMIN_ROUTE_GROUPS`).toBeTruthy();
    },
  );

  it('PREVIEW_LINKS موثّقة: /beneficiary مُسمّى "معاينة" لتمييزه عن واجهة المستفيد الحقيقية', () => {
    const preview = allAdminLinks.find((l) => l.to === '/beneficiary');
    expect(preview?.label).toContain('معاينة');
  });
});
