/**
 * عقد حدود الأدوار: admin vs accountant
 *
 * يحرس بشكل صريح:
 *  - ADMIN_ONLY يحوي 'admin' فقط
 *  - ADMIN_ROLES يحوي admin + accountant بالضبط
 *  - كل المسارات الإدارية الحساسة مستبعدة من المحاسب
 */
import { describe, it, expect } from 'vitest';
import { ADMIN_ONLY, ADMIN_ROLES } from '@/constants/roles';
import { ACCOUNTANT_EXCLUDED_ROUTES } from '@/constants/navigation';

const ADMIN_SENSITIVE_ROUTES = [
  '/dashboard/users',
  '/dashboard/settings',
  '/dashboard/zatca',
  '/dashboard/diagnostics',
  '/dashboard/email-monitor',
  '/dashboard/comparison',
] as const;

describe('Role boundary contract — admin vs accountant', () => {
  it('ADMIN_ONLY يحوي admin فقط', () => {
    expect([...ADMIN_ONLY].sort()).toEqual(['admin']);
  });

  it('ADMIN_ROLES يحوي admin + accountant بالضبط', () => {
    expect([...ADMIN_ROLES].sort()).toEqual(['accountant', 'admin']);
  });

  it.each(ADMIN_SENSITIVE_ROUTES)(
    'المسار الإداري الحساس %s مستبعد للمحاسب',
    (route) => {
      expect(ACCOUNTANT_EXCLUDED_ROUTES).toContain(route);
    },
  );

  it('لا تسرّب لمسارات /beneficiary/* ضمن قائمة استبعاد المحاسب (باستثناء الجذر)', () => {
    const beneficiarySpecific = ACCOUNTANT_EXCLUDED_ROUTES.filter(
      (r) => r.startsWith('/beneficiary') && r !== '/beneficiary',
    );
    expect(beneficiarySpecific).toEqual([]);
  });
});
