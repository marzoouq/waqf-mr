/**
 * اختبارات الفلترة بالرؤية والأذونات
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
      { '/dashboard/properties': 'properties' },
      { properties: false },
    );
    expect(result.map(l => l.to)).toEqual(['/dashboard', '/dashboard/contracts']);
  });

  it('يبقي الرابط عندما sectionVisibility=true', () => {
    const result = filterLinksBySectionVisibility(
      sample,
      { '/dashboard/properties': 'properties' },
      { properties: true },
    );
    expect(result).toHaveLength(3);
  });
});

describe('filterLinksByPermissions', () => {
  it('يبقي كل الروابط حين لا توجد قيود', () => {
    const result = filterLinksByPermissions(sample, {}, {});
    expect(result).toHaveLength(3);
  });

  it('يحذف الروابط حين perm=false', () => {
    const result = filterLinksByPermissions(
      sample,
      { '/dashboard/contracts': 'view_contracts' },
      { view_contracts: false },
    );
    expect(result.map(l => l.to)).toEqual(['/dashboard', '/dashboard/properties']);
  });

  it('يعتبر undefined كمسموح', () => {
    const result = filterLinksByPermissions(
      sample,
      { '/dashboard/contracts': 'view_contracts' },
      {},
    );
    expect(result).toHaveLength(3);
  });
});
