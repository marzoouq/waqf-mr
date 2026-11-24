import { describe, it, expect } from 'vitest';
import { ltr, ltrYears } from './bidi';

describe('ltr', () => {
  it('يعزل وسم السنة المالية باتجاه يسار-يمين', () => {
    expect(ltr('2025-2026')).toBe('\u20662025-2026\u2069');
  });
  it('يعيد نصاً فارغاً للقيم الفارغة', () => {
    expect(ltr(undefined)).toBe('');
    expect(ltr('')).toBe('');
  });
});

describe('ltrYears', () => {
  it('يعزل كل وسم سنة داخل نص عربي حر', () => {
    expect(ltrYears('رقبة الوقف من السنة 2025-2026')).toBe('رقبة الوقف من السنة \u20662025-2026\u2069');
  });
  it('لا يعزل الوسم المعزول مسبقاً مرتين', () => {
    expect(ltrYears('السنة \u20662025-2026\u2069')).toBe('السنة \u20662025-2026\u2069');
  });
});
