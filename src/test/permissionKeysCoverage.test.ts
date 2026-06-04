/**
 * P0 — اختبار اتساق مفاتيح الصلاحيات بين routeRegistry و rolePermissions و ROLE_SECTION_DEFS
 *
 * يمنع التراجع لما يلي:
 *  1) كل permKey في BENEFICIARY_ROUTES يجب أن يوجد في DEFAULT_ROLE_PERMS.beneficiary
 *     (لأن usePermissionCheck يسلك opt-out: مفتاح غير معرّف = مسموح صامتاً = ثغرة تحكم).
 *  2) كل permKey في ADMIN_ROUTES يجب أن يوجد في DEFAULT_ROLE_PERMS.accountant
 *     (admin مستثنى — يتجاوز كل الحراس).
 *  3) كل permKey في BENEFICIARY_ROUTES يجب أن يوجد في ROLE_SECTION_DEFS
 *     لكي يعرضه RolePermissionsTab للناظر.
 *  4) لا توجد مفاتيح في DEFAULT_ROLE_PERMS.{beneficiary,waqif} لا يقابلها أي permKey
 *     في BENEFICIARY_ROUTES (يكشف dead keys مثل `reports` القديم).
 */
import { describe, it, expect } from 'vitest';
import { ADMIN_ROUTES, BENEFICIARY_ROUTES } from '@/constants/routeRegistry';
import { DEFAULT_ROLE_PERMS } from '@/constants/rolePermissions';
import { ROLE_SECTION_DEFS } from '@/constants/sections';

const beneficiaryPermKeys = Array.from(
  new Set(Object.values(BENEFICIARY_ROUTES).map(m => m.permKey).filter((k): k is string => !!k)),
);

const adminPermKeys = Array.from(
  new Set(Object.values(ADMIN_ROUTES).map(m => m.permKey).filter((k): k is string => !!k)),
);

const sectionDefKeys = new Set(ROLE_SECTION_DEFS.map(d => d.key));

const benePerms = DEFAULT_ROLE_PERMS.beneficiary ?? {};
const waqifPerms = DEFAULT_ROLE_PERMS.waqif ?? {};
const accountantPerms = DEFAULT_ROLE_PERMS.accountant ?? {};

describe('P0 — تغطية مفاتيح الصلاحيات', () => {
  it('كل permKey للمستفيد معرّف في DEFAULT_ROLE_PERMS.beneficiary', () => {
    const missing = beneficiaryPermKeys.filter(k => !(k in DEFAULT_ROLE_PERMS.beneficiary));
    expect(missing, `مفاتيح مفقودة للمستفيد: ${missing.join(', ')}`).toEqual([]);
  });

  it('كل permKey للمستفيد معرّف في DEFAULT_ROLE_PERMS.waqif (أو يُحجب صراحة)', () => {
    // الواقف قد يحجب بعض المفاتيح بـ false — لكن يجب أن تكون معرّفة لا غائبة
    const missing = beneficiaryPermKeys.filter(k => !(k in DEFAULT_ROLE_PERMS.waqif));
    expect(missing, `مفاتيح مفقودة للواقف: ${missing.join(', ')}`).toEqual([]);
  });

  it('كل permKey للمحاسب معرّف في DEFAULT_ROLE_PERMS.accountant', () => {
    const missing = adminPermKeys.filter(k => !(k in DEFAULT_ROLE_PERMS.accountant));
    expect(missing, `مفاتيح مفقودة للمحاسب: ${missing.join(', ')}`).toEqual([]);
  });

  it('كل permKey للمستفيد معرض في ROLE_SECTION_DEFS (RolePermissionsTab)', () => {
    const missing = beneficiaryPermKeys.filter(k => !sectionDefKeys.has(k));
    expect(missing, `مفاتيح غير معروضة في مصفوفة الصلاحيات: ${missing.join(', ')}`).toEqual([]);
  });

  it('لا dead keys في DEFAULT_ROLE_PERMS.beneficiary (كل مفتاح يقابله مسار)', () => {
    const validKeys = new Set(beneficiaryPermKeys);
    const dead = Object.keys(DEFAULT_ROLE_PERMS.beneficiary).filter(k => !validKeys.has(k));
    expect(dead, `مفاتيح ميتة للمستفيد: ${dead.join(', ')}`).toEqual([]);
  });

  it('لا dead keys في DEFAULT_ROLE_PERMS.waqif (كل مفتاح يقابله مسار)', () => {
    const validKeys = new Set(beneficiaryPermKeys);
    const dead = Object.keys(DEFAULT_ROLE_PERMS.waqif).filter(k => !validKeys.has(k));
    expect(dead, `مفاتيح ميتة للواقف: ${dead.join(', ')}`).toEqual([]);
  });
});
