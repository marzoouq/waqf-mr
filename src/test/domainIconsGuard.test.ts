/**
 * حارس قاموس الأيقونات: أيقونة واحدة لكل معنى، ولا تتكرر أيقونة في القائمة نفسها.
 */
import { describe, it, expect } from 'vitest';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { allAdminLinks, allBeneficiaryLinks } from '@/constants/navigation';
import { BOTTOM_NAV_LINKS } from '@/constants/bottomNavLinks';

const dupIcons = (links: ReadonlyArray<{ to: string; icon: unknown }>) => {
  const seen = new Map<unknown, string>();
  const dups: string[] = [];
  for (const l of links) {
    const prev = seen.get(l.icon);
    if (prev && prev !== l.to) dups.push(`${prev} = ${l.to}`);
    seen.set(l.icon, l.to);
  }
  return dups;
};

describe('domain icon dictionary', () => {
  it('لا تُستخدم أيقونة لمعنيين في القاموس', () => {
    const values = Object.values(DOMAIN_ICONS);
    expect(new Set(values).size).toBe(values.length);
  });
  it('قائمة الناظر: كل رابط بأيقونة مختلفة', () => {
    expect(dupIcons(allAdminLinks.filter((l) => l.to !== '/beneficiary'))).toEqual([]);
  });
  it('قائمة المستفيد: كل رابط بأيقونة مختلفة', () => {
    expect(dupIcons(allBeneficiaryLinks)).toEqual([]);
  });
  it('الشريط السفلي يستخدم أيقونة القاموس نفسها لكل مسار', () => {
    const byRoute = new Map<string, unknown>([...allAdminLinks, ...allBeneficiaryLinks].map((l) => [l.to, l.icon]));
    for (const links of Object.values(BOTTOM_NAV_LINKS)) {
      for (const l of links) {
        if (byRoute.has(l.to) && l.to !== '/beneficiary') expect(l.icon).toBe(byRoute.get(l.to));
      }
    }
  });
  it('أيقونة المصروفات حصرية لصفحة المصروفات', () => {
    const users = [...allAdminLinks, ...allBeneficiaryLinks].filter((l) => l.icon === DOMAIN_ICONS.expense).map((l) => l.to);
    expect(users.sort()).toEqual(['/beneficiary/expenses', '/dashboard/expenses']);
  });
});
