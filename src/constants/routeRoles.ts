/**
 * ROUTE_ROLES — مصدر حقيقة موحَّد لأدوار كل مسار في النظام
 *
 * مستخرَج صراحة من ملفات `src/routes/*.tsx` (39 مساراً):
 *  - 22 مسار admin (17 ADMIN_ROLES + 5 ADMIN_ONLY + /dashboard)
 *  - 16 مسار beneficiary (مختلطة BENEFICIARY_ROLES و ALL_NON_ACCOUNTANT)
 *  - 1 مسار waqif (/waqif)
 *
 * أي تعديل على ملفات routes يجب أن يُحدِّث هذا الجدول.
 * يُستهلَك في: permissionKeysCoverage.test, roleRouteAccess.test, audit matrix.
 *
 * لا يحتوي fallback — كل مسار يجب أن يكون مذكوراً صراحة.
 */
import type { AppRole } from '@/types';

export const ROUTE_ROLES: Record<string, readonly AppRole[]> = {
  // ─── Admin dashboard (admin + accountant) — 17 مسار ───
  '/dashboard': ['admin', 'accountant'],
  '/dashboard/properties': ['admin', 'accountant'],
  '/dashboard/contracts': ['admin', 'accountant'],
  '/dashboard/income': ['admin', 'accountant'],
  '/dashboard/expenses': ['admin', 'accountant'],
  '/dashboard/beneficiaries': ['admin', 'accountant'],
  '/dashboard/reports': ['admin', 'accountant'],
  '/dashboard/accounts': ['admin', 'accountant'],
  '/dashboard/distributions': ['admin', 'accountant'],
  '/dashboard/messages': ['admin', 'accountant'],
  '/dashboard/invoices': ['admin', 'accountant'],
  '/dashboard/audit-log': ['admin', 'accountant'],
  '/dashboard/bylaws': ['admin', 'accountant'],
  '/dashboard/support': ['admin', 'accountant'],
  '/dashboard/annual-report': ['admin', 'accountant'],
  '/dashboard/chart-of-accounts': ['admin', 'accountant'],

  // ─── Admin only — 8 مسار ───
  '/dashboard/users': ['admin'],
  '/dashboard/settings': ['admin'],
  '/dashboard/zatca': ['admin'],
  '/dashboard/comparison': ['admin'],
  '/dashboard/diagnostics': ['admin'],
  '/dashboard/email-monitor': ['admin'],
  '/dashboard/audit-report-final': ['admin'],
  '/dashboard/cleanup-report': ['admin'],

  // ─── Beneficiary surface ───
  // BENEFICIARY_ROLES = admin + beneficiary — 7 مسار
  '/beneficiary': ['admin', 'beneficiary'],
  '/beneficiary/disclosure': ['admin', 'beneficiary'],
  '/beneficiary/my-share': ['admin', 'beneficiary'],
  '/beneficiary/carryforward': ['admin', 'beneficiary'],
  '/beneficiary/messages': ['admin', 'beneficiary'],
  '/beneficiary/notifications': ['admin', 'beneficiary'],
  '/beneficiary/support': ['admin', 'beneficiary'],

  // ALL_NON_ACCOUNTANT = admin + beneficiary + waqif — 9 مسار
  '/beneficiary/properties': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/contracts': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/financial-reports': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/accounts': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/settings': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/invoices': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/expenses': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/bylaws': ['admin', 'beneficiary', 'waqif'],
  '/beneficiary/annual-report': ['admin', 'beneficiary', 'waqif'],

  // ─── Waqif landing — 1 مسار ───
  '/waqif': ['admin', 'waqif'],
} as const;

/** قائمة كل الأدوار الفعلية المستخدمة في النظام (للمصفوفة الكاملة) */
export const ALL_APP_ROLES: readonly AppRole[] = ['admin', 'accountant', 'beneficiary', 'waqif'] as const;

/** عدد المسارات المتوقع (لاستخدام الاختبارات كـ sanity check) */
export const EXPECTED_ROUTE_COUNT = 41;
