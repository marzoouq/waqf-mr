import { describe, it, expect } from 'vitest';
import { filterRelevantContracts } from './activeContractsFilter';

/**
 * منطق فلترة العقود — مطابق لـ AdminDashboard و WaqifDashboard
 * isSpecificYear = true → كل العقود (نشطة + منتهية + مسودة)
 * isSpecificYear = false → العقود النشطة فقط
 */

const testContracts = [
  { id: 'c1', status: 'active' },
  { id: 'c2', status: 'expired' },
  { id: 'c3', status: 'active' },
  { id: 'c4', status: 'draft' },
];

describe('filterRelevantContracts — فلترة العقود', () => {
  it('isSpecificYear = true → يُعيد كل العقود', () => {
    const result = filterRelevantContracts(testContracts, true);
    expect(result).toHaveLength(4);
  });

  it('isSpecificYear = false → العقود النشطة فقط', () => {
    const result = filterRelevantContracts(testContracts, false);
    expect(result).toHaveLength(2);
    expect(result.every(c => c.status === 'active')).toBe(true);
  });

  it('قائمة فارغة → يُعيد قائمة فارغة', () => {
    expect(filterRelevantContracts([], true)).toHaveLength(0);
    expect(filterRelevantContracts([], false)).toHaveLength(0);
  });

  it('لا عقود نشطة مع isSpecificYear = false → قائمة فارغة', () => {
    const expired = [{ id: 'c1', status: 'expired' }, { id: 'c2', status: 'draft' }];
    expect(filterRelevantContracts(expired, false)).toHaveLength(0);
  });
});
