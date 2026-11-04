import { describe, it, expect } from 'vitest';
import { nextRenewalNumber } from './renewalNumber';

describe('nextRenewalNumber — تجديد العقد بالرقم نفسه', () => {
  it('أول تجديد لعقد أصلي يضيف -R1', () => {
    expect(nextRenewalNumber('10213803102', [])).toBe('10213803102-R1');
  });

  it('تجديد نسخة R1 ينتج R2', () => {
    expect(nextRenewalNumber('10213803102-R1', ['10213803102', '10213803102-R1'])).toBe('10213803102-R2');
  });

  it('لا يقترح رقمًا مستخدمًا: تجديد الأصل مرة ثانية بعد وجود R1 وR2 ينتج R3', () => {
    expect(
      nextRenewalNumber('10213803102', ['10213803102', '10213803102-R1', '10213803102-R2']),
    ).toBe('10213803102-R3');
  });

  it('يتجاوز الفراغات المحجوزة ولا يكرر رقم عقد آخر', () => {
    expect(nextRenewalNumber('A-R1', ['A', 'A-R1', 'A-R2', 'A-R5'])).toBe('A-R6');
  });
});
