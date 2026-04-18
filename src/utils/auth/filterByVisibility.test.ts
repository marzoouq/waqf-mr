/**
 * اختبارات الفلترة بالرؤية والأذونات (مُنقول من lib/permissions/ — موجة 14)
 */
import { describe, it, expect } from 'vitest';
import { filterLinksBySectionVisibility, filterLinksByPermissions } from './filterByVisibility';

const sample = [
  { to: '/dashboard', label: 'الرئيسية' },
  { to: '/dashboard/properties', label: 'العقارات' },
  { to: '/dashboard/contracts', label: 'العقود' },
];

describe('filterLinksBySectionVisibility', () => {
  it('يبقي الروابط غير المسجَّلة في الخريطة', () => {
    const result = filterLinksBySectionVisibility(sample, {}, {});
    expect(result).toHaveLength(3);
  });

  it('يحذف الروابط المعطَّلة عبر sectionVisibility=false', () => {
    const result = filterLinksBySectionVisibility(
      sample,
      { '/dashboard/properties': 'props' },
      { props: false },
    );
    expect(result).toHaveLength(2);
    expect(result.find(l => l.to === '/dashboard/properties')).toBeUndefined();
  });

  it('يبقي الروابط بـ sectionVisibility=true أو غير محدد', () => {
    const result = filterLinksBySectionVisibility(
      sample,
      { '/dashboard/properties': 'props' },
      { props: true },
    );
    expect(result).toHaveLength(3);
  });
});

describe('filterLinksByPermissions', () => {
  it('يبقي الروابط غير المسجَّلة', () => {
    const result = filterLinksByPermissions(sample, {}, {});
    expect(result).toHaveLength(3);
  });

  it('يحذف الروابط بـ permission=false', () => {
    const result = filterLinksByPermissions(
      sample,
      { '/dashboard/contracts': 'manage_contracts' },
      { manage_contracts: false },
    );
    expect(result).toHaveLength(2);
  });

  it('يبقي الروابط بـ permission=undefined كافتراض آمن', () => {
    const result = filterLinksByPermissions(
      sample,
      { '/dashboard/contracts': 'manage_contracts' },
      {},
    );
    expect(result).toHaveLength(3);
  });
});
