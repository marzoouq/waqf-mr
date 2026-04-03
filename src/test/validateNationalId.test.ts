import { describe, it, expect } from 'vitest';
import { validateSaudiNationalId, getNationalIdError } from '@/utils/validateNationalId';

describe('validateSaudiNationalId — خوارزمية Luhn', () => {
  it('يرفض رقم أقل من 10 أرقام', () => {
    expect(validateSaudiNationalId('123456789')).toBe(false);
  });

  it('يرفض رقم أكثر من 10 أرقام', () => {
    expect(validateSaudiNationalId('12345678901')).toBe(false);
  });

  it('يرفض رقم يبدأ بـ 0', () => {
    expect(validateSaudiNationalId('0123456789')).toBe(false);
  });

  it('يرفض رقم يبدأ بـ 3', () => {
    expect(validateSaudiNationalId('3123456789')).toBe(false);
  });

  it('يرفض أحرف غير رقمية', () => {
    expect(validateSaudiNationalId('1234abcd90')).toBe(false);
  });

  it('يقبل رقم هوية صحيح يبدأ بـ 1 (مواطن)', () => {
    // نولّد رقماً صحيحاً بخوارزمية Luhn
    const validId = generateLuhnValid('1');
    expect(validateSaudiNationalId(validId)).toBe(true);
  });

  it('يقبل رقم هوية صحيح يبدأ بـ 2 (مقيم)', () => {
    const validId = generateLuhnValid('2');
    expect(validateSaudiNationalId(validId)).toBe(true);
  });

  it('يرفض رقم هوية بخانة تحقق خاطئة', () => {
    const validId = generateLuhnValid('1');
    // نغيّر الرقم الأخير لإفساد خانة التحقق
    const lastDigit = Number(validId[9]);
    const wrongDigit = (lastDigit + 1) % 10;
    const invalidId = validId.slice(0, 9) + wrongDigit;
    expect(validateSaudiNationalId(invalidId)).toBe(false);
  });
});

describe('getNationalIdError — رسائل الخطأ', () => {
  it('يقبل قيمة فارغة (اختياري)', () => {
    expect(getNationalIdError('')).toBeNull();
  });

  it('يرفض أحرف غير رقمية مع رسالة مناسبة', () => {
    expect(getNationalIdError('abc')).toContain('أرقام فقط');
  });

  it('يرفض طول غير صحيح مع رسالة مناسبة', () => {
    expect(getNationalIdError('12345')).toContain('10 أرقام');
  });

  it('يرفض بداية غير صحيحة مع رسالة مناسبة', () => {
    expect(getNationalIdError('3123456789')).toContain('يبدأ بـ 1');
  });

  it('يرفض رقم بخانة تحقق خاطئة', () => {
    const validId = generateLuhnValid('1');
    const lastDigit = Number(validId[9]);
    const wrongDigit = (lastDigit + 1) % 10;
    const invalidId = validId.slice(0, 9) + wrongDigit;
    expect(getNationalIdError(invalidId)).toContain('غير صحيح');
  });

  it('يقبل رقم صحيح', () => {
    const validId = generateLuhnValid('1');
    expect(getNationalIdError(validId)).toBeNull();
  });
});

// مساعد: توليد رقم هوية صالح حسب Luhn
function generateLuhnValid(prefix: string): string {
  const base = prefix + '00000000'; // 9 أرقام + سنحسب الأخير
  const digits = base.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = digits[i] ?? 0;
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base.slice(0, 9) + checkDigit;
}
