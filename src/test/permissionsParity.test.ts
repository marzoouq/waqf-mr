/**
 * اختبار تكافؤ منطق الصلاحيات بين useNavLinks و usePermissionCheck.
 * يضمن أن السلوك opt-out موحَّد: مفتاح غير محدد → مسموح، false صريح → ممنوع.
 */
import { describe, it, expect } from 'vitest';
import { filterLinksByPermissions, filterLinksBySectionVisibility } from '@/utils/auth/filterByVisibility';

const links = [
  { to: '/dashboard/properties' },
  { to: '/dashboard/income' },
  { to: '/dashboard/expenses' },
];
const permKeys = {
  '/dashboard/properties': 'properties',
  '/dashboard/income': 'income',
  '/dashboard/expenses': 'expenses',
};

describe('Permissions parity (filterLinksByPermissions ↔ usePermissionCheck)', () => {
  it('opt-out: مفتاح صلاحية غير موجود يبقى الرابط ظاهراً', () => {
    const result = filterLinksByPermissions(links, permKeys, {});
    expect(result).toHaveLength(3);
  });

  it('opt-out: قيمة undefined لا تحجب الرابط', () => {
    const result = filterLinksByPermissions(links, permKeys, { income: undefined });
    expect(result.map(l => l.to)).toContain('/dashboard/income');
  });

  it('opt-out: false صريح يحجب الرابط فقط', () => {
    const result = filterLinksByPermissions(links, permKeys, { income: false, properties: true });
    expect(result.map(l => l.to)).toEqual(['/dashboard/properties', '/dashboard/expenses']);
  });

  it('section visibility: نفس قاعدة opt-out', () => {
    const sectionMap = {
      '/dashboard/properties': 'properties',
      '/dashboard/income': 'income',
    };
    const result = filterLinksBySectionVisibility(links, sectionMap, { income: false });
    expect(result.map(l => l.to)).toEqual(['/dashboard/properties', '/dashboard/expenses']);
  });
});
