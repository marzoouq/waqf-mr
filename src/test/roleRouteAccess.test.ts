/**
 * Round W — roleRouteAccess: pure logic، بدون render صفحات
 *
 * 156 حالة (4 أدوار × 39 مساراً) تتحقق من تطابق canAccessRoute()
 * مع effective_allowed في المصفوفة المُولَّدة.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROUTE_ROLES, ALL_APP_ROLES } from '@/constants/routeRoles';
import { DEFAULT_ROLE_PERMS } from '@/constants/rolePermissions';
import { evaluateAccess } from '@/utils/auth/canAccessRoute';
import type { AppRole } from '@/types';

const CSV_PATH = resolve(process.cwd(), 'audit/ui-permissions-matrix.csv');

describe('Round W — roleRouteAccess (pure)', () => {
  it('canAccessRoute() = effective_allowed في المصفوفة لكل 156 حالة', () => {
    expect(existsSync(CSV_PATH)).toBe(true);
    const lines = readFileSync(CSV_PATH, 'utf8').trim().split('\n').slice(1);

    const mismatches: string[] = [];
    for (const line of lines) {
      const [route, role, , , , effective_allowed] = line.split(',');
      if (!route || !role || !effective_allowed) continue;
      const result = evaluateAccess({
        role: role as AppRole,
        route,
        rolePerms: DEFAULT_ROLE_PERMS,
      });
      const expected = effective_allowed === 'true';
      if (result.allowed !== expected) {
        mismatches.push(`${role}@${route}: matrix=${expected} computed=${result.allowed} (${result.basis})`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('admin يمر دائماً (admin-override)', () => {
    for (const route of Object.keys(ROUTE_ROLES)) {
      const r = evaluateAccess({ role: 'admin', route, rolePerms: DEFAULT_ROLE_PERMS });
      expect(r.allowed, `admin مرفوض في ${route}`).toBe(true);
      expect(r.basis).toBe('admin-override');
    }
  });

  it('rejection عند denied-role لكل دور خارج ROUTE_ROLES', () => {
    for (const route of Object.keys(ROUTE_ROLES)) {
      const allowed = new Set(ROUTE_ROLES[route] as readonly AppRole[]);
      for (const role of ALL_APP_ROLES) {
        if (role === 'admin' || allowed.has(role)) continue;
        const r = evaluateAccess({ role, route, rolePerms: DEFAULT_ROLE_PERMS });
        expect(r.allowed, `${role} يجب أن يُرفض في ${route}`).toBe(false);
        expect(r.basis).toBe('denied-role');
      }
    }
  });

  it('permission gate: تعطيل permKey يحجب الدور (مثال: beneficiary/invoices)', () => {
    const customPerms = {
      ...DEFAULT_ROLE_PERMS,
      beneficiary: { ...DEFAULT_ROLE_PERMS.beneficiary, invoices: false },
    };
    const r = evaluateAccess({
      role: 'beneficiary', route: '/beneficiary/invoices', rolePerms: customPerms,
    });
    expect(r.allowed).toBe(false);
    expect(r.basis).toBe('denied-permission');
  });

  it('section gate: تعطيل sectionKey يحجب الدور', () => {
    const r = evaluateAccess({
      role: 'beneficiary', route: '/beneficiary/invoices',
      rolePerms: DEFAULT_ROLE_PERMS,
      beneficiarySections: { invoices: false },
    });
    expect(r.allowed).toBe(false);
    expect(r.basis).toBe('denied-section');
  });

  it('uncontrolled basis لمسارات بدون permKey/sectionKey (/waqif)', () => {
    const r = evaluateAccess({ role: 'waqif', route: '/waqif', rolePerms: DEFAULT_ROLE_PERMS });
    expect(r.allowed).toBe(true);
    expect(r.basis).toBe('uncontrolled');
  });

  it('غياب الدور (null) = رفض', () => {
    const r = evaluateAccess({ role: null, route: '/dashboard', rolePerms: DEFAULT_ROLE_PERMS });
    expect(r.allowed).toBe(false);
    expect(r.basis).toBe('denied-role');
  });

  it('مسار غير معروف = unknown-route', () => {
    const r = evaluateAccess({ role: 'admin', route: '/does/not/exist', rolePerms: DEFAULT_ROLE_PERMS });
    // admin override يفوز على unknown-route — هذه قاعدة المشروع
    expect(r.basis).toBe('admin-override');
    const r2 = evaluateAccess({ role: 'beneficiary', route: '/does/not/exist', rolePerms: DEFAULT_ROLE_PERMS });
    expect(r2.basis).toBe('unknown-route');
    expect(r2.allowed).toBe(false);
  });
});
