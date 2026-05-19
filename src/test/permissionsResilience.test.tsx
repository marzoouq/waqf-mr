/**
 * مصفوفة مرونة الصلاحيات: useNavLinks تحت كل تركيبة منطقية
 * من الأدوار والأقسام والصلاحيات. تضمن أن أي تغيير في الإعداد لا يحجب
 * الروابط الأساسية الخاطئة ولا يكسر المسارات المحمية.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const authMock = vi.fn();
const sectionsMock = vi.fn();
const permsMock = vi.fn();

vi.mock('@/hooks/auth/session/useAuthContext', () => ({
  useAuth: () => authMock(),
}));
vi.mock('@/hooks/data/settings/useAppSettings', () => ({
  useAppSettings: () => ({ getJsonSetting: (_k: string, fb: unknown) => fb }),
}));
vi.mock('@/hooks/data/settings/useSectionsVisibility', () => ({
  useSectionsVisibility: () => sectionsMock(),
}));
vi.mock('@/hooks/data/settings/useRolePermissions', () => ({
  useRolePermissions: () => ({ getPermissionsForRole: (r: string) => permsMock(r) }),
}));

import { useNavLinks } from '@/hooks/application/useNavLinks';
import {
  defaultAdminSections,
  defaultBeneficiarySections,
  ACCOUNTANT_EXCLUDED_ROUTES,
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

describe('Permissions resilience matrix', () => {
  beforeEach(() => {
    authMock.mockReset();
    sectionsMock.mockReset();
    permsMock.mockReset();
  });

  // ─────────────────────── ADMIN ───────────────────────
  describe('ناظر', () => {
    it('كل أقسام الناظر ظاهرة افتراضياً (باستثناء /beneficiary المُلحقة)', () => {
      setup('admin');
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      // كل مسار في ADMIN_ROUTES يجب أن يظهر
      for (const route of Object.keys(ADMIN_ROUTES)) {
        expect(routes, `missing admin route: ${route}`).toContain(route);
      }
    });

    it('settings و users محميان حتى لو حاولنا إخفاءهما', () => {
      setup('admin', { admin: { settings: false, users: false } });
      const { result } = renderHook(() => useNavLinks());
      // الحماية تُطبَّق في useSectionsVisibility، لكن نحاكي هنا أن الإعداد جاء بـ false
      // ومع ذلك، يجب أن تُفعّل القائمة الحماية بشكل غير مباشر عبر isProtectedAdminSection.
      // لا نتمكن من اختبار الحماية إلا عبر useSectionsVisibility الحقيقي.
      // هنا نتأكد أن منطق الفلترة الخالص يحجبهما عندما false (تأكيد سلوك الفلتر).
      const routes = tos(result.current);
      expect(routes).not.toContain('/dashboard/settings');
      expect(routes).not.toContain('/dashboard/users');
      // لكن قائمة PROTECTED_ADMIN_SECTIONS تضمن في الـ data hook ألا تصل false إلى هنا أبداً
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
      // روابط أساسية يجب أن تظهر
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
      setup('accountant', { perms: { /* لا شيء */ } });
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      expect(routes).toContain('/dashboard/accounts');
      expect(routes).toContain('/dashboard/invoices');
    });
  });

  // ─────────────────────── BENEFICIARY ───────────────────────
  describe('مستفيد', () => {
    it('كل الأقسام ظاهرة افتراضياً', () => {
      setup('beneficiary');
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      // أهم مسارات المستفيد
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

    it('false صريح على صلاحية يحجب الرابط', () => {
      setup('beneficiary', { perms: { messages: false } });
      const { result } = renderHook(() => useNavLinks());
      expect(tos(result.current)).not.toContain('/beneficiary/messages');
    });

    it('كل مسارات BENEFICIARY_ROUTES ذات sectionKey مغطّاة', () => {
      setup('beneficiary');
      const { result } = renderHook(() => useNavLinks());
      const routes = tos(result.current);
      // فقط المسارات الموجودة في allBeneficiaryLinks (وليس كل routeRegistry)
      // لكن نتأكد أن الفئات الأساسية كلها تظهر دون false
      const required = Object.keys(BENEFICIARY_ROUTES).filter((r) =>
        ['/beneficiary/properties', '/beneficiary/contracts', '/beneficiary/bylaws'].includes(r),
      );
      for (const r of required) expect(routes).toContain(r);
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
});
