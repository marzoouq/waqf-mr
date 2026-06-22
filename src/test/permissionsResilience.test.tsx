/**
 * مصفوفة مرونة الصلاحيات: useNavLinks تحت كل تركيبة منطقية
 * من الأدوار والأقسام والصلاحيات. تضمن أن أي تغيير في الإعداد لا يحجب
 * الروابط الأساسية الخاطئة ولا يكسر المسارات المحمية ولا يسرّب روابط
 * بين لوحات الناظر والمستفيد.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const authMock = vi.fn();
const sectionsMock = vi.fn();
const permsMock = vi.fn();

vi.mock('@/hooks/auth/session/useAuthContext', () => ({
  useAuth: () => authMock(),
}));
vi.mock('@/hooks/data/settings/app/useAppSettings', () => ({
  useAppSettings: () => ({ getJsonSetting: (_k: string, fb: unknown) => fb }),
}));
vi.mock('@/hooks/data/settings/permissions/useSectionsVisibility', () => ({
  useSectionsVisibility: () => sectionsMock(),
}));
vi.mock('@/hooks/data/settings/permissions/useRolePermissions', () => ({
  useRolePermissions: () => ({ getPermissionsForRole: (r: string) => permsMock(r) }),
}));

import { useNavLinks } from '@/hooks/application/useNavLinks';
import {
  defaultAdminSections,
  defaultBeneficiarySections,
  ACCOUNTANT_EXCLUDED_ROUTES,
  allAdminLinks,
  allBeneficiaryLinks,
  ADMIN_ROUTE_PERM_KEYS,
  BENEFICIARY_ROUTE_PERM_KEYS,
  ADMIN_ROUTE_TO_SECTION,
  BENEFICIARY_ROUTE_TO_SECTION,
} from '@/constants/navigation';
import { PROTECTED_ADMIN_SECTIONS } from '@/constants/sections';
import { ADMIN_ROUTES, BENEFICIARY_ROUTES } from '@/constants/routeRegistry';

const tos = (links: { to: string }[]) => links.map((l) => l.to);

const setup = (
  role: 'admin' | 'accountant' | 'beneficiary' | 'waqif',
  opts: {
    admin?: Record<string, boolean>;
    beneficiary?: Record<string, boolean>;
    perms?: Record<string, boolean>;
  } = {},
) => {
  authMock.mockReturnValue({ role });
  sectionsMock.mockReturnValue({
    adminSections: { ...defaultAdminSections, ...(opts.admin ?? {}) },
    beneficiarySections: { ...defaultBeneficiarySections, ...(opts.beneficiary ?? {}) },
  });
  permsMock.mockReturnValue(opts.perms ?? {});
};

// مسارات الناظر/المستفيد الموجودة فعلاً في القوائم (مصدر بيانات useNavLinks)
const ADMIN_NAV_ROUTES = allAdminLinks.map((l) => l.to);
const BENEFICIARY_NAV_ROUTES = allBeneficiaryLinks.map((l) => l.to);

describe('Permissions resilience matrix', () => {
  beforeEach(() => {
    authMock.mockReset();
    sectionsMock.mockReset();
    permsMock.mockReset();
  });

  // ─────────────────────── ADMIN ───────────────────────
  describe('ناظر', () => {
    it('كل أقسام الناظر ظاهرة افتراضياً (باستثناء /beneficiary المُلحقة وتقارير التدقيق المنقولة لـ audit-log)', () => {
      setup('admin');
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      // P1/C3: audit-report-final و cleanup-report نُقلتا إلى أزرار داخل /dashboard/audit-log
      const HIDDEN_FROM_SIDEBAR = new Set(['/dashboard/audit-report-final', '/dashboard/cleanup-report']);
      for (const route of Object.keys(ADMIN_ROUTES)) {
        if (HIDDEN_FROM_SIDEBAR.has(route)) continue;
        expect(routes, `missing admin route: ${route}`).toContain(route);
      }
    });

    it('settings و users محميان على مستوى البيانات (قائمة PROTECTED_ADMIN_SECTIONS)', () => {
      expect([...PROTECTED_ADMIN_SECTIONS].sort()).toEqual(['settings', 'users']);
    });

    it('إخفاء أي قسم اختياري يحجب الرابط فقط', () => {
      setup('admin', { admin: { expenses: false, invoices: false } });
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      expect(routes).not.toContain('/dashboard/expenses');
      expect(routes).not.toContain('/dashboard/invoices');
      expect(routes).toContain('/dashboard/contracts');
      expect(routes).toContain('/dashboard/properties');
    });

    // مصفوفة كاملة: لكل تبويب ناظر، إخفاء sectionKey يحجبه فقط ولا يمسّ غيره
    describe('مصفوفة كل تبويب × sectionKey=false (لا تسرّب)', () => {
      const protectedSet = new Set<string>(PROTECTED_ADMIN_SECTIONS);
      const adminRoutesWithSection = Object.entries(ADMIN_ROUTES).filter(
        ([route, meta]) =>
          meta.sectionKey &&
          !protectedSet.has(meta.sectionKey) &&
          ADMIN_NAV_ROUTES.includes(route),
      );

      it.each(adminRoutesWithSection)(
        '%s: إخفاء قسمه يحجبه فقط',
        (route, meta) => {
          setup('admin', { admin: { [meta.sectionKey!]: false } });
          const { result } = renderHook(() => useNavLinks());
          const routes = tos(result.current);
          expect(routes, `${route} should be hidden`).not.toContain(route);
          // بقية الروابط لم تتأثر
          for (const other of ADMIN_NAV_ROUTES) {
            if (other === route) continue;
            const otherSection = ADMIN_ROUTE_TO_SECTION[other];
            // قد يشترك مساران في نفس sectionKey نظرياً؛ نتسامح في تلك الحالة
            if (otherSection && otherSection === meta.sectionKey) continue;
            expect(routes, `leak: ${other} disappeared when hiding ${route}`).toContain(other);
          }
        },
      );

      it('settings و users يبقيان لو وصل sectionKey=false (يُعتبر أن useSectionsVisibility حماهما)', () => {
        // محاكاة الحماية: نمرّر true رغم محاولة الإخفاء (وهذا ما يفعله الهوك الحقيقي)
        setup('admin', { admin: { settings: true, users: true } });
        const { result } = renderHook(() => useNavLinks());
        const routes = tos(result.current);
        expect(routes).toContain('/dashboard/settings');
        expect(routes).toContain('/dashboard/users');
      });
    });
  });

  // ─────────────────────── ACCOUNTANT ───────────────────────
  describe('محاسب', () => {
    it('بدون أي صلاحيات صريحة: الروابط الافتراضية تظهر، والمستثناة محذوفة', () => {
      setup('accountant');
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      for (const excluded of ACCOUNTANT_EXCLUDED_ROUTES) {
        expect(routes, `accountant must not see ${excluded}`).not.toContain(excluded);
      }
      expect(routes).toContain('/dashboard/properties');
      expect(routes).toContain('/dashboard/contracts');
      expect(routes).toContain('/dashboard/accounts');
    });

    it('false صريح يحجب الرابط فقط', () => {
      setup('accountant', { perms: { properties: false } });
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      expect(routes).not.toContain('/dashboard/properties');
      expect(routes).toContain('/dashboard/contracts');
    });

    it('opt-out: مفتاح غير محدد يبقي الرابط ظاهراً', () => {
      setup('accountant', { perms: {} });
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      expect(routes).toContain('/dashboard/accounts');
      expect(routes).toContain('/dashboard/invoices');
    });

    describe('مصفوفة كل تبويب محاسب × permKey=false (لا تسرّب)', () => {
      const accountantRoutes = ADMIN_NAV_ROUTES.filter(
        (r) => !ACCOUNTANT_EXCLUDED_ROUTES.includes(r) && ADMIN_ROUTE_PERM_KEYS[r],
      );

      it.each(accountantRoutes)('%s: permKey=false يحجبه فقط', (route) => {
        const permKey = ADMIN_ROUTE_PERM_KEYS[route]!;
        setup('accountant', { perms: { [permKey]: false } });
        const { result } = renderHook(() => useNavLinks());
        const routes = tos(result.current);
        expect(routes).not.toContain(route);
        for (const other of accountantRoutes) {
          if (other === route) continue;
          if (ADMIN_ROUTE_PERM_KEYS[other] === permKey) continue;
          expect(routes, `leak: ${other} disappeared when blocking ${route}`).toContain(other);
        }
      });
    });
  });

  // ─────────────────────── BENEFICIARY ───────────────────────
  describe('مستفيد', () => {
    it('كل الأقسام ظاهرة افتراضياً', () => {
      setup('beneficiary');
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      for (const route of [
        '/beneficiary',
        '/beneficiary/my-share',
        '/beneficiary/invoices',
        '/beneficiary/expenses',
        '/beneficiary/financial-reports',
      ]) {
        expect(routes, `missing beneficiary route: ${route}`).toContain(route);
      }
    });

    it('إخفاء invoices لا يؤثر على expenses (الفصل المعماري)', () => {
      setup('beneficiary', { beneficiary: { invoices: false } });
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      expect(routes).not.toContain('/beneficiary/invoices');
      expect(routes).toContain('/beneficiary/expenses');
    });

    it('إخفاء expenses لا يؤثر على invoices', () => {
      setup('beneficiary', { beneficiary: { expenses: false } });
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      expect(routes).not.toContain('/beneficiary/expenses');
      expect(routes).toContain('/beneficiary/invoices');
    });

    it('إخفاء share لا يخفي carryforward (#24 مفاتيح مستقلة)', () => {
      setup('beneficiary', { beneficiary: { share: false } });
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      expect(routes).not.toContain('/beneficiary/my-share');
      expect(routes).toContain('/beneficiary/carryforward');
    });

    it('false صريح على صلاحية يحجب الرابط', () => {
      setup('beneficiary', { perms: { messages: false } });
      const { result } = renderHook(() => useNavLinks());
      expect(tos(result.current)).not.toContain('/beneficiary/messages');
    });

    describe('مصفوفة كل تبويب مستفيد × sectionKey=false (لا تسرّب)', () => {
      const beneficiaryRoutesWithSection = Object.entries(BENEFICIARY_ROUTES).filter(
        ([route, meta]) => meta.sectionKey && BENEFICIARY_NAV_ROUTES.includes(route),
      );

      it.each(beneficiaryRoutesWithSection)('%s: إخفاء قسمه يحجبه فقط', (route, meta) => {
        setup('beneficiary', { beneficiary: { [meta.sectionKey!]: false } });
        const { result } = renderHook(() => useNavLinks());
        const routes = tos(result.current);
        expect(routes).not.toContain(route);
        for (const other of BENEFICIARY_NAV_ROUTES) {
          if (other === route) continue;
          const otherSection = BENEFICIARY_ROUTE_TO_SECTION[other];
          if (otherSection && otherSection === meta.sectionKey) continue;
          expect(routes, `leak: ${other} disappeared when hiding ${route}`).toContain(other);
        }
      });
    });

    describe('مصفوفة كل تبويب مستفيد × permKey=false (لا تسرّب)', () => {
      const beneficiaryRoutesWithPerm = BENEFICIARY_NAV_ROUTES.filter(
        (r) => BENEFICIARY_ROUTE_PERM_KEYS[r],
      );

      it.each(beneficiaryRoutesWithPerm)('%s: permKey=false يحجبه فقط', (route) => {
        const permKey = BENEFICIARY_ROUTE_PERM_KEYS[route]!;
        setup('beneficiary', { perms: { [permKey]: false } });
        const { result } = renderHook(() => useNavLinks());
        const routes = tos(result.current);
        expect(routes).not.toContain(route);
        for (const other of beneficiaryRoutesWithPerm) {
          if (other === route) continue;
          if (BENEFICIARY_ROUTE_PERM_KEYS[other] === permKey) continue;
          expect(routes, `leak: ${other} disappeared when blocking ${route}`).toContain(other);
        }
      });
    });
  });

  // ─────────────────────── WAQIF ───────────────────────
  describe('واقف', () => {
    it('الرئيسية تُعاد توجيهها إلى /waqif بدل /beneficiary', () => {
      setup('waqif');
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      expect(routes).toContain('/waqif');
      expect(routes).not.toContain('/beneficiary');
    });

    it('إخفاء قسم بـ false يحجب الرابط للواقف أيضاً', () => {
      setup('waqif', { beneficiary: { invoices: false } });
      const { result } = renderHook(() => useNavLinks());
      expect(tos(result.current)).not.toContain('/beneficiary/invoices');
    });
  });

  // ─────────────────────── CROSS-SURFACE ISOLATION ───────────────────────
  describe('عزل بين الواجهتين: لا تسرّب روابط بين dashboard و beneficiary', () => {
    const allSections = Array.from(
      new Set([
        ...Object.values(ADMIN_ROUTE_TO_SECTION),
        ...Object.values(BENEFICIARY_ROUTE_TO_SECTION),
      ]),
    ).filter(Boolean) as string[];

    // `/beneficiary` كرابط معاينة للناظر مسموح — نمنع فقط مسارات المستفيد الفرعية
    const isBeneficiarySubRoute = (r: string) => r.startsWith('/beneficiary/');

    it.each(['admin', 'accountant'] as const)(
      '%s لا يرى أي مسار /beneficiary/<sub> (افتراضي)',
      (role) => {
        setup(role);
        const { result } = renderHook(() => useNavLinks());
        for (const r of tos(result.current)) {
          expect(isBeneficiarySubRoute(r), `${role} leaked sub-route ${r}`).toBe(false);
        }
      },
    );

    it.each(['beneficiary', 'waqif'] as const)(
      '%s لا يرى أي رابط /dashboard (افتراضي)',
      (role) => {
        setup(role);
        const { result } = renderHook(() => useNavLinks());
        for (const r of tos(result.current)) {
          expect(r.startsWith('/dashboard'), `${role} leaked ${r}`).toBe(false);
        }
      },
    );

    it.each(allSections)('إخفاء section=%s لا يكسر العزل عبر الأدوار', (section) => {
      for (const role of ['admin', 'accountant', 'beneficiary', 'waqif'] as const) {
        setup(role, {
          admin: { [section]: false },
          beneficiary: { [section]: false },
        });
        const { result } = renderHook(() => useNavLinks());
        const routes = tos(result.current);
        if (role === 'admin' || role === 'accountant') {
          for (const r of routes) {
            expect(isBeneficiarySubRoute(r)).toBe(false);
          }
        } else {
          for (const r of routes) {
            expect(r.startsWith('/dashboard')).toBe(false);
          }
        }
      }
    });
  });
});
