import { describe, it, expect } from 'vitest';
import { computeDistributionBase, isPercentageTotalOff, shareOf } from './distributionBase';

describe('أساس التوزيع', () => {
  it('المقرر 1,000,000 من متاح 1,384,986.63 يُوزَّع 1,000,000 فقط', () => {
    const r = computeDistributionBase(1_384_986.63, 1_000_000);
    expect(r.base).toBe(1_000_000);
    expect(r.remaining).toBe(384_986.63);
    expect(r.exceeds).toBe(false);
  });
  it('حصة 10.29% تُحسب من المقرر لا من المتاح', () => {
    const r = computeDistributionBase(1_384_986.63, 1_000_000);
    expect(shareOf(r.base, 10.294, 100)).toBeCloseTo(102_940, 0);
  });
  it('المقرر الأكبر من المتاح لا يتجاوز المتاح ويُنبَّه', () => {
    const r = computeDistributionBase(500_000, 600_000);
    expect(r.base).toBe(500_000);
    expect(r.exceeds).toBe(true);
  });
  it('المقرر 500,000 يُوزَّع 500,000 ويبقى 884,986.63', () => {
    const r = computeDistributionBase(1_384_986.63, 500_000);
    expect(r.base).toBe(500_000);
    expect(r.remaining).toBe(884_986.63);
    expect(shareOf(r.base, 10.294, 100)).toBeCloseTo(51_470, 0);
  });
  it('بدون مقرر يُوزَّع المتاح كاملاً', () => {
    expect(computeDistributionBase(995_000.78, 0).base).toBe(995_000.78);
  });
  it('السنة المقفلة: المنفّذ المحفوظ 995,000.03 هو الأساس', () => {
    expect(computeDistributionBase(995_000.78, 995_000.03).base).toBe(995_000.03);
  });
  it('مجموع 100.000003% لا يُظهر تحذيراً، و99.5% يُظهره', () => {
    expect(isPercentageTotalOff(100.000003)).toBe(false);
    expect(isPercentageTotalOff(99.5)).toBe(true);
  });
});
