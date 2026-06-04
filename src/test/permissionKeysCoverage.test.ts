/**
 * P0 — اختبار اتساق مفاتيح الصلاحيات بين routeRegistry و rolePermissions و ROLE_SECTION_DEFS
 *
 * الهدف: منع ثغرة opt-out في usePermissionCheck (مفتاح غير معرّف = مسموح صامتاً).
 * نتحقق من أن كل دور يملك تعريفاً صريحاً (true/false) لكل permKey في مسار يستطيع
 * فعلياً الوصول إليه — وفق role lists في beneficiaryRoutes.tsx/adminRoutes.tsx.
 */
import { describe, it, expect } from 'vitest';
import { ADMIN_ROUTES, BENEFICIARY_ROUTES } from '@/constants/routeRegistry';
import { DEFAULT_ROLE_PERMS } from '@/constants/rolePermissions';
import { ROLE_SECTION_DEFS } from '@/constants/sections';

/** خريطة المسار إلى الأدوار التي تصل إليه فعلياً (مستخرجة من ملفات routes).
 *  أي تعديل على beneficiaryRoutes.tsx يجب أن يُحدِّث هذا الجدول. */
const ROUTE_ROLES: Record<string, readonly string[]> = {
  // beneficiary routes
  '/beneficiary': ['admin', 'beneficiary'],
  '/beneficiary/properties': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/contracts': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/disclosure': ['admin', 'beneficiary'],
  '/beneficiary/my-share': ['admin', 'beneficiary'],
  '/beneficiary/carryforward': ['admin', 'beneficiary'],
  '/beneficiary/financial-reports': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/accounts': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/settings': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/messages': ['admin', 'beneficiary'],
  '/beneficiary/invoices': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/expenses': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/notifications': ['admin', 'beneficiary'],
  '/beneficiary/bylaws': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/support': ['admin', 'beneficiary'],
  '/beneficiary/annual-report': ['admin', 'beneficiary', 'waqif'],
  '/waqif': ['admin', 'waqif'],
};

function permKeysReachableBy(role: string, source: Record<string, { permKey?: string }>): string[] {
  const keys = new Set<string>();
  for (const [path, meta] of Object.entries(source)) {
    if (!meta.permKey) continue;
    const roles = ROUTE_ROLES[path];
    // إذا لم يكن المسار في الخريطة (admin routes) نفترض أن admin+accountant يصلان إليه
    const reachable = roles ?? ['admin', 'accountant'];
    if (reachable.includes(role)) keys.add(meta.permKey);
  }
  return [...keys];
}

const beneReachable = permKeysReachableBy('beneficiary', BENEFICIARY_ROUTES);
const waqifReachable = permKeysReachableBy('waqif', BENEFICIARY_ROUTES);
const accountantReachable = permKeysReachableBy('accountant', ADMIN_ROUTES);
const allBeneficiaryPermKeys = Array.from(
  new Set(Object.values(BENEFICIARY_ROUTES).map(m => m.permKey).filter((k): k is string => !!k)),
);

const benePerms = DEFAULT_ROLE_PERMS.beneficiary ?? {};
const waqifPerms = DEFAULT_ROLE_PERMS.waqif ?? {};
const accountantPerms = DEFAULT_ROLE_PERMS.accountant ?? {};
const sectionDefKeys = new Set(ROLE_SECTION_DEFS.map(d => d.key));

describe('P0 — تغطية مفاتيح الصلاحيات', () => {
  it('كل permKey يصل إليه المستفيد معرّف صراحة في DEFAULT_ROLE_PERMS.beneficiary', () => {
    const missing = beneReachable.filter(k => !(k in benePerms));
    expect(missing, `مفاتيح مفقودة للمستفيد: ${missing.join(', ')}`).toEqual([]);
  });

  it('كل permKey يصل إليه الواقف معرّف صراحة في DEFAULT_ROLE_PERMS.waqif', () => {
    const missing = waqifReachable.filter(k => !(k in waqifPerms));
    expect(missing, `مفاتيح مفقودة للواقف: ${missing.join(', ')}`).toEqual([]);
  });

  it('كل permKey يصل إليه المحاسب معرّف صراحة في DEFAULT_ROLE_PERMS.accountant', () => {
    const missing = accountantReachable.filter(k => !(k in accountantPerms));
    expect(missing, `مفاتيح مفقودة للمحاسب: ${missing.join(', ')}`).toEqual([]);
  });

  it('كل permKey للمستفيد معروض في ROLE_SECTION_DEFS (RolePermissionsTab)', () => {
    const missing = allBeneficiaryPermKeys.filter(k => !sectionDefKeys.has(k));
    expect(missing, `مفاتيح غير معروضة في مصفوفة الصلاحيات: ${missing.join(', ')}`).toEqual([]);
  });

  it('لا dead keys في DEFAULT_ROLE_PERMS.beneficiary (كل مفتاح يقابله مسار حقيقي)', () => {
    const validKeys = new Set(allBeneficiaryPermKeys);
    const dead = Object.keys(benePerms).filter(k => !validKeys.has(k));
    expect(dead, `مفاتيح ميتة للمستفيد: ${dead.join(', ')}`).toEqual([]);
  });

  it('لا dead keys في DEFAULT_ROLE_PERMS.waqif (كل مفتاح يقابله مسار حقيقي)', () => {
    const validKeys = new Set(allBeneficiaryPermKeys);
    const dead = Object.keys(waqifPerms).filter(k => !validKeys.has(k));
    expect(dead, `مفاتيح ميتة للواقف: ${dead.join(', ')}`).toEqual([]);
  });

  it('خريطة ROUTE_ROLES تغطي كل beneficiary routes (تحديث يدوي مطلوب عند إضافة مسار)', () => {
    const missing = Object.keys(BENEFICIARY_ROUTES).filter(p => !(p in ROUTE_ROLES));
    expect(missing, `مسارات بدون أدوار في الخريطة: ${missing.join(', ')}`).toEqual([]);
  });
});
