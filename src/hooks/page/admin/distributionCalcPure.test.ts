/**
 * اختبارات خوارزمية توزيع الحصص — Largest Remainder Method
 */
import { describe, it, expect } from 'vitest';
import { calculateDistributions } from './distributionCalcPure';

const makeBen = (id: string, pct: number) => ({
  id, name: `مستفيد ${id}`, share_percentage: pct,
});

describe('calculateDistributions — Penny Allocation', () => {
  it('يوزّع 1000 على 3 مستفيدين (33.33% لكل) بدون فقدان', () => {
    const bens = [makeBen('a', 33.33), makeBen('b', 33.33), makeBen('c', 33.34)];
    const result = calculateDistributions(bens, 1000);
    const total = result.reduce((s, r) => s + r.share_amount, 0);
    expect(total).toBeCloseTo(1000, 2);
    result.forEach(r => expect(r.share_amount).toBeGreaterThan(0));
  });

  it('يوزّع 1000 على 3 مستفيدين متساويين (33.33% لكل) — المجموع = 1000', () => {
    const bens = [makeBen('a', 33.33), makeBen('b', 33.33), makeBen('c', 33.33)];
    const result = calculateDistributions(bens, 1000);
    const total = result.reduce((s, r) => s + r.share_amount, 0);
    // يجب أن يساوي المبلغ المتاح بالضبط
    expect(total).toBeCloseTo(1000, 2);
  });

  it('يُرجع صفر لجميع الحصص عند مبلغ صفر', () => {
    const bens = [makeBen('a', 50), makeBen('b', 50)];
    const result = calculateDistributions(bens, 0);
    result.forEach(r => {
      expect(r.share_amount).toBe(0);
      expect(r.net_amount).toBe(0);
    });
  });

  it('يُعطي المبلغ كاملاً لمستفيد واحد بنسبة 100%', () => {
    const bens = [makeBen('a', 100)];
    const result = calculateDistributions(bens, 5000);
    expect(result[0].share_amount).toBe(5000);
    expect(result[0].net_amount).toBe(5000);
  });

  it('يوزّع 999.99 على 3 متساويين بدون فقدان', () => {
    const bens = [makeBen('a', 33.33), makeBen('b', 33.33), makeBen('c', 33.34)];
    const result = calculateDistributions(bens, 999.99);
    const total = result.reduce((s, r) => s + r.share_amount, 0);
    expect(total).toBeCloseTo(999.99, 2);
  });

  it('يخصم السلف من الحصة ويُظهر العجز', () => {
    const bens = [makeBen('a', 50), makeBen('b', 50)];
    const advances = { a: 600 };
    const result = calculateDistributions(bens, 1000, advances);
    const a = result.find(r => r.beneficiary_id === 'a');
    expect(a).toBeDefined();
    expect(a!.share_amount).toBe(500);
    expect(a!.advances_paid).toBe(600);
    expect(a!.net_amount).toBe(0);
    expect(a!.deficit).toBe(100);
  });

  it('يخصم السلف والترحيل معاً', () => {
    const bens = [makeBen('a', 100)];
    const advances = { a: 200 };
    const carry = { a: 100 };
    const result = calculateDistributions(bens, 1000, advances, carry);
    expect(result[0].share_amount).toBe(1000);
    expect(result[0].net_amount).toBe(700);
    expect(result[0].deficit).toBe(0);
  });

  it('يتعامل مع نسب صفرية لجميع المستفيدين', () => {
    const bens = [makeBen('a', 0), makeBen('b', 0)];
    const result = calculateDistributions(bens, 1000);
    result.forEach(r => {
      expect(r.share_amount).toBe(0);
      expect(r.net_amount).toBe(0);
    });
  });

  it('يتعامل مع مصفوفة مستفيدين فارغة', () => {
    const result = calculateDistributions([], 1000);
    expect(result).toHaveLength(0);
  });

  it('يوزّع مبلغ كبير بدقة', () => {
    const bens = [makeBen('a', 25), makeBen('b', 25), makeBen('c', 25), makeBen('d', 25)];
    const result = calculateDistributions(bens, 1000000);
    const total = result.reduce((s, r) => s + r.share_amount, 0);
    expect(total).toBeCloseTo(1000000, 2);
    result.forEach(r => expect(r.share_amount).toBe(250000));
  });
});
