import { describe, it, expect } from 'vitest';
import { formatHijriGregorian } from './hijriDate';

describe('formatHijriGregorian', () => {
  it('يعرض التاريخين معاً', () => {
    const r = formatHijriGregorian('2025-11-01');
    expect(r.gregorian).toBe('2025/11/01');
    expect(r.hijri).toMatch(/^1447\/05\/\d{2} هـ$/);
  });
  it('تاريخ غير صالح', () => {
    expect(formatHijriGregorian('bad')).toEqual({ gregorian: '-', hijri: '-' });
  });
});
