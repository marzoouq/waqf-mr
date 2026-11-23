import { describe, it, expect } from 'vitest';
import { ltr } from './bidi';

describe('ltr', () => {
  it('يعزل وسم السنة المالية باتجاه يسار-يمين', () => {
    expect(ltr('2025-2026')).toBe('\u20662025-2026\u2069');
  });
  it('يعيد نصاً فارغاً للقيم الفارغة', () => {
    expect(ltr(undefined)).toBe('');
    expect(ltr('')).toBe('');
  });
});
