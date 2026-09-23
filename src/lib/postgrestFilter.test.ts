import { describe, it, expect } from 'vitest';
import { sanitizeOrPattern, toSafeIlikePattern } from './postgrestFilter';

describe('toSafeIlikePattern', () => {
  it('يغلّف المدخل بعلامات % ويحافظ على النص العادي', () => {
    expect(toSafeIlikePattern('  أحمد  ')).toBe('%أحمد%');
  });

  it('يهرّب wildcards حتى لا يجلب المستخدم كل الصفوف', () => {
    expect(toSafeIlikePattern('%')).toBe('%\\%%');
    expect(toSafeIlikePattern('a_b')).toBe('%a\\_b%');
  });

  it('يزيل محارف صيغة الفلتر (فاصلة/أقواس/تنصيص/نقطتان/شرطة عكسية)', () => {
    const out = toSafeIlikePattern('x,or(id.eq.1)');
    expect(out).not.toMatch(/[,()"\\:]/);
    expect(out.startsWith('%')).toBe(true);
    expect(out.endsWith('%')).toBe(true);
  });

  it('يمنع حقن فلتر إضافي عبر فاصلة', () => {
    const out = toSafeIlikePattern('a,email.ilike.*');
    expect(out.includes(',')).toBe(false);
  });

  it('يحدّ الطول لمنع استعلامات ضخمة', () => {
    expect(toSafeIlikePattern('ب'.repeat(1000)).length).toBeLessThanOrEqual(202);
  });
});

describe('sanitizeOrPattern', () => {
  it('يزيل المحارف المحجوزة ويترك % كما هي', () => {
    expect(sanitizeOrPattern('%a,b%')).toBe('%a b%');
  });

  it('يحدّ الطول عند 200 محرف', () => {
    expect(sanitizeOrPattern('x'.repeat(500)).length).toBe(200);
  });
});
