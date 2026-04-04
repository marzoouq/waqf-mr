import { describe, it, expect } from 'vitest';
import {
  CHART_COLORS, ARABIC_MONTHS, formatArabicMonth, tooltipStyleRtl,
} from './chartHelpers';

describe('CHART_COLORS', () => {
  it('يحتوي 8 ألوان على الأقل', () => {
    expect(CHART_COLORS.length).toBeGreaterThanOrEqual(8);
  });

  it('كل لون يستخدم متغير CSS دلالي (hsl(var(--...)))', () => {
    for (const color of CHART_COLORS) {
      expect(color).toMatch(/^hsl\(var\(--[\w-]+\)\)$/);
    }
  });
});

describe('ARABIC_MONTHS', () => {
  it('يحتوي 12 شهراً', () => {
    expect(Object.keys(ARABIC_MONTHS)).toHaveLength(12);
  });

  it('يربط 01 بـ يناير و 12 بـ ديسمبر', () => {
    expect(ARABIC_MONTHS['01']).toBe('يناير');
    expect(ARABIC_MONTHS['12']).toBe('ديسمبر');
  });

  it('كل مفتاح مكوّن من رقمين', () => {
    for (const key of Object.keys(ARABIC_MONTHS)) {
      expect(key).toMatch(/^\d{2}$/);
    }
  });
});

describe('formatArabicMonth', () => {
  it('يحوّل YYYY-MM إلى اسم الشهر العربي', () => {
    expect(formatArabicMonth('2025-01')).toBe('يناير');
    expect(formatArabicMonth('2024-06')).toBe('يونيو');
    expect(formatArabicMonth('2024-12')).toBe('ديسمبر');
  });

  it('يُرجع النص الأصلي عند صيغة غير معروفة', () => {
    expect(formatArabicMonth('unknown')).toBe('unknown');
    expect(formatArabicMonth('2025-13')).toBe('2025-13');
  });

  it('يعالج null/undefined', () => {
    expect(formatArabicMonth(null)).toBe('');
    expect(formatArabicMonth(undefined)).toBe('');
  });

  it('يعالج أرقام', () => {
    expect(formatArabicMonth(202501)).toBe('202501');
  });

  it('يعالج نص فارغ', () => {
    expect(formatArabicMonth('')).toBe('');
  });
});

describe('tooltipStyleRtl', () => {
  it('direction = rtl', () => {
    expect(tooltipStyleRtl.direction).toBe('rtl');
  });

  it('textAlign = right', () => {
    expect(tooltipStyleRtl.textAlign).toBe('right');
  });

  it('fontFamily = inherit', () => {
    expect(tooltipStyleRtl.fontFamily).toBe('inherit');
  });
});
