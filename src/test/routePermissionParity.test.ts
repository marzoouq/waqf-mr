/**
 * Round V1 — Parity صارم بين routeRegistry / rolePermissions / sections / SECTION_LABELS
 *
 * يمنع رجوع مشاكل مفاتيح الصلاحيات (مثل ثغرة `financial_reports`/`carryforward` السابقة).
 * أي تعديل على المسارات أو الصلاحيات يجب أن يبقي هذه العقود متوازنة.
 */
import { describe, it, expect } from 'vitest';
import { ADMIN_ROUTES, BENEFICIARY_ROUTES } from '@/constants/routeRegistry';
import { DEFAULT_ROLE_PERMS } from '@/constants/rolePermissions';
import {
  ADMIN_SECTION_KEYS,
  BENEFICIARY_SECTION_KEYS,
  ROLE_SECTION_DEFS,
  SECTION_LABELS,
} from '@/constants/sections';
import {
  allAdminLinks,
  allBeneficiaryLinks,
  ADMIN_ROUTE_TO_SECTION,
  BENEFICIARY_ROUTE_TO_SECTION,
} from '@/constants/navigation';

/**
 * Whitelist موثّق صراحةً: مسارات بدون permKey/sectionKey عمداً.
 * يجب توثيق كل إضافة هنا بسبب واضح، وإلا فالأفضل إضافة مفتاح للسجل.
 */
const UNCONTROLLED_ROUTES = new Set<string>([
  // الإعدادات الشخصية متاحة لكل دور دائماً (لا حجب).
  '/beneficiary/settings',
  // /waqif هي صفحة لوحة الواقف الجذرية — التحكم عبر ProtectedRoute للأدوار.
  '/waqif',
  // /beneficiary و /dashboard هما جذور لوحات لا تحتاج permKey.
  '/beneficiary',
  '/dashboard',
  // المسارات الإدارية البحتة (admin-only) محجوبة عبر ProtectedRoute مباشرة.
  '/dashboard/users',
  '/dashboard/settings',
  '/dashboard/zatca',
  '/dashboard/diagnostics',
  '/dashboard/email-monitor',
  '/dashboard/comparison',
]);

describe('Round V1 — Parity مفاتيح الصلاحيات والأقسام', () => {
  describe('SECTION_LABELS coverage', () => {
    it('كل key في ROLE_SECTION_DEFS له label في SECTION_LABELS', () => {
      const missing = ROLE_SECTION_DEFS.filter(d => !(d.key in SECTION_LABELS)).map(d => d.key);
      expect(missing, `مفاتيح بدون label: ${missing.join(', ')}`).toEqual([]);
    });

    it('كل sectionKey في ADMIN_ROUTES له label', () => {
      const keys = Object.values(ADMIN_ROUTES).map(m => m.sectionKey).filter((k): k is string => !!k);
      const missing = keys.filter(k => !(k in SECTION_LABELS));
      expect(missing).toEqual([]);
    });

    it('كل sectionKey في BENEFICIARY_ROUTES له label', () => {
      const keys = Object.values(BENEFICIARY_ROUTES).map(m => m.sectionKey).filter((k): k is string => !!k);
      const missing = keys.filter(k => !(k in SECTION_LABELS));
      expect(missing).toEqual([]);
    });
  });

  describe('SECTION_KEYS coverage', () => {
    it('كل sectionKey في BENEFICIARY_ROUTES موجود في BENEFICIARY_SECTION_KEYS', () => {
      const set = new Set<string>(BENEFICIARY_SECTION_KEYS as readonly string[]);
      const missing = Object.values(BENEFICIARY_ROUTES)
        .map(m => m.sectionKey)
        .filter((k): k is string => !!k)
        .filter(k => !set.has(k));
      expect(missing, `أقسام مفقودة من BENEFICIARY_SECTION_KEYS: ${missing.join(', ')}`).toEqual([]);
    });

    it('كل sectionKey في ADMIN_ROUTES موجود في ADMIN_SECTION_KEYS', () => {
      const set = new Set<string>(ADMIN_SECTION_KEYS as readonly string[]);
      const missing = Object.values(ADMIN_ROUTES)
        .map(m => m.sectionKey)
        .filter((k): k is string => !!k)
        .filter(k => !set.has(k));
      expect(missing, `أقسام مفقودة من ADMIN_SECTION_KEYS: ${missing.join(', ')}`).toEqual([]);
    });
  });

  describe('Sidebar links ↔ Route registry parity', () => {
    it('كل رابط في allAdminLinks مسجَّل في ADMIN_ROUTES أو /beneficiary (معاينة)', () => {
      const missing = allAdminLinks
        .map(l => l.to)
        .filter(to => !(to in ADMIN_ROUTES) && to !== '/beneficiary');
      expect(missing, `روابط لا تطابق السجل: ${missing.join(', ')}`).toEqual([]);
    });

    it('كل رابط في allBeneficiaryLinks مسجَّل في BENEFICIARY_ROUTES', () => {
      const missing = allBeneficiaryLinks
        .map(l => l.to)
        .filter(to => !(to in BENEFICIARY_ROUTES));
      expect(missing, `روابط مستفيد لا تطابق السجل: ${missing.join(', ')}`).toEqual([]);
    });
  });

  describe('Uncontrolled routes whitelist', () => {
    it('كل مسار في ADMIN_ROUTES بدون permKey ولا sectionKey مدرَج في whitelist', () => {
      const violations: string[] = [];
      for (const [route, meta] of Object.entries(ADMIN_ROUTES)) {
        const uncontrolled = !meta.permKey && !meta.sectionKey;
        if (uncontrolled && !UNCONTROLLED_ROUTES.has(route)) violations.push(route);
      }
      expect(violations, `مسارات غير محكومة وغير موثقة: ${violations.join(', ')}`).toEqual([]);
    });

    it('كل مسار في BENEFICIARY_ROUTES بدون permKey ولا sectionKey مدرَج في whitelist', () => {
      const violations: string[] = [];
      for (const [route, meta] of Object.entries(BENEFICIARY_ROUTES)) {
        const uncontrolled = !meta.permKey && !meta.sectionKey;
        if (uncontrolled && !UNCONTROLLED_ROUTES.has(route)) violations.push(route);
      }
      expect(violations, `مسارات مستفيد غير محكومة وغير موثقة: ${violations.join(', ')}`).toEqual([]);
    });
  });

  describe('Route → Section maps coverage', () => {
    it('كل مسار /dashboard/* (غير الجذر) له sectionKey في ADMIN_ROUTE_TO_SECTION أو في whitelist', () => {
      const routes = Object.keys(ADMIN_ROUTES).filter(r => r !== '/dashboard');
      const missing = routes.filter(r => !ADMIN_ROUTE_TO_SECTION[r] && !UNCONTROLLED_ROUTES.has(r));
      expect(missing, `مسارات بلا قسم: ${missing.join(', ')}`).toEqual([]);
    });

    it('كل مسار /beneficiary/* (غير الجذر) له sectionKey في BENEFICIARY_ROUTE_TO_SECTION أو في whitelist', () => {
      const routes = Object.keys(BENEFICIARY_ROUTES).filter(r => r !== '/beneficiary' && r !== '/waqif');
      const missing = routes.filter(r => !BENEFICIARY_ROUTE_TO_SECTION[r] && !UNCONTROLLED_ROUTES.has(r));
      expect(missing, `مسارات مستفيد بلا قسم: ${missing.join(', ')}`).toEqual([]);
    });
  });

  describe('Legacy / dead-key guard', () => {
    it('لا يوجد مفتاح "reports" في DEFAULT_ROLE_PERMS.beneficiary (legacy)', () => {
      expect(DEFAULT_ROLE_PERMS.beneficiary).not.toHaveProperty('reports');
    });

    it('لا يوجد مفتاح "reports" في DEFAULT_ROLE_PERMS.waqif (legacy)', () => {
      expect(DEFAULT_ROLE_PERMS.waqif).not.toHaveProperty('reports');
    });

    it('financial_reports و carryforward موجودان للمستفيد', () => {
      const bene = DEFAULT_ROLE_PERMS.beneficiary ?? {};
      expect(bene.financial_reports).toBe(true);
      expect(bene.carryforward).toBe(true);
    });

    it('financial_reports موجود للواقف، carryforward غير معروض (الواقف لا يصل /carryforward)', () => {
      const waqif = DEFAULT_ROLE_PERMS.waqif ?? {};
      expect(waqif.financial_reports).toBe(true);
      // الواقف ليس له حصة فردية → لا ترحيلات شخصية
      expect(waqif).not.toHaveProperty('carryforward');
    });
  });
});
