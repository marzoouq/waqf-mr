import { describe, it, expect } from 'vitest';
import { toMonthMap, toExpenseRecord } from './yearComparisonHelpers';

describe('toMonthMap', () => {
  it('يحوّل أشهر 1-12 إلى 0-11', () => {
    const entries = [
      { month: 1, total: 1000 },
      { month: 6, total: 5000 },
      { month: 12, total: 9000 },
    ];
    const map = toMonthMap(entries);
    expect(map.get(0)).toBe(1000);  // يناير
    expect(map.get(5)).toBe(5000);  // يونيو
    expect(map.get(11)).toBe(9000); // ديسمبر
  });

  it('يُعيد خريطة فارغة لمصفوفة فارغة', () => {
    const map = toMonthMap([]);
    expect(map.size).toBe(0);
  });

  it('يتعامل مع قيم null/undefined عبر safeNumber', () => {
    const entries = [
      { month: 3, total: null as unknown as number },
      { month: 7, total: undefined as unknown as number },
    ];
    const map = toMonthMap(entries);
    expect(map.get(2)).toBe(0);
    expect(map.get(6)).toBe(0);
  });

  it('يتعامل مع قيم نصية عبر safeNumber', () => {
    const entries = [
      { month: 1, total: '2500' as unknown as number },
    ];
    const map = toMonthMap(entries);
    expect(map.get(0)).toBe(2500);
  });
});

describe('toExpenseRecord', () => {
  it('يحوّل مصفوفة أنواع المصروفات إلى Record', () => {
    const entries = [
      { expense_type: 'صيانة', total: 3000 },
      { expense_type: 'تأمين', total: 1500 },
    ];
    const rec = toExpenseRecord(entries);
    expect(rec['صيانة']).toBe(3000);
    expect(rec['تأمين']).toBe(1500);
  });

  it('يُعيد كائن فارغ لمصفوفة فارغة', () => {
    const rec = toExpenseRecord([]);
    expect(Object.keys(rec)).toHaveLength(0);
  });

  it('يتعامل مع أنواع مكررة (آخر قيمة تفوز)', () => {
    const entries = [
      { expense_type: 'صيانة', total: 3000 },
      { expense_type: 'صيانة', total: 5000 },
    ];
    const rec = toExpenseRecord(entries);
    expect(rec['صيانة']).toBe(5000);
  });
});
