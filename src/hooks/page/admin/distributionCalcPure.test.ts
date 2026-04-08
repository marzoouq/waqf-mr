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
    expect(result[0]!.share_amount).toBe(5000);
    expect(result[0]!.net_amount).toBe(5000);
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
    expect(result[0]!.share_amount).toBe(1000);
    expect(result[0]!.net_amount).toBe(700);
    expect(result[0]!.deficit).toBe(0);
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

describe('تغطية الفروع المتقدمة', () => {
  it('ينقل user_id للنتيجة (موجود و null)', () => {
    const bens = [
      { id: 'a', name: 'أحمد', share_percentage: 50, user_id: 'uid-1' },
      { id: 'b', name: 'سعد', share_percentage: 50, user_id: null },
    ];
    const result = calculateDistributions(bens, 1000);
    expect(result[0]!.beneficiary_user_id).toBe('uid-1');
    expect(result[1]!.beneficiary_user_id).toBeNull();
  });

  it('يوزّع نسبياً عندما المجموع لا يساوي 100%', () => {
    const bens = [makeBen('a', 20), makeBen('b', 40)];
    const result = calculateDistributions(bens, 600);
    expect(result.find(r => r.beneficiary_id === 'a')!.share_amount).toBeCloseTo(200, 2);
    expect(result.find(r => r.beneficiary_id === 'b')!.share_amount).toBeCloseTo(400, 2);
  });

  it('يحدّ الترحيل بالمتبقي بعد السلف', () => {
    const bens = [makeBen('a', 100)];
    const result = calculateDistributions(bens, 500, { a: 400 }, { a: 300 });
    const a = result[0]!;
    expect(a.share_amount).toBe(500);
    expect(a.advances_paid).toBe(400);
    expect(a.carryforward_deducted).toBe(100);
    expect(a.net_amount).toBe(0);
    expect(a.deficit).toBe(200);
  });

  it('يحسب العجز عندما السلف + الترحيل أكبر من الحصة', () => {
    const bens = [makeBen('a', 100)];
    const result = calculateDistributions(bens, 500, { a: 600 }, { a: 200 });
    const a = result[0]!;
    expect(a.carryforward_deducted).toBe(0);
    expect(a.net_amount).toBe(0);
    expect(a.deficit).toBe(300);
  });

  it('يعطي صفر لمستفيد بنسبة 0% وكامل المبلغ لنسبة 100%', () => {
    const bens = [makeBen('a', 0), makeBen('b', 100)];
    const result = calculateDistributions(bens, 1000);
    expect(result.find(r => r.beneficiary_id === 'a')!.share_amount).toBe(0);
    expect(result.find(r => r.beneficiary_id === 'b')!.share_amount).toBe(1000);
  });

  it('penny allocation: 100 على 3 متساويين = 100 بالضبط', () => {
    const bens = [makeBen('a', 33.33), makeBen('b', 33.33), makeBen('c', 33.33)];
    const result = calculateDistributions(bens, 100);
    const total = result.reduce((s, r) => s + r.share_amount, 0);
    expect(total).toBeCloseTo(100, 2);
    const amounts = result.map(r => r.share_amount).sort();
    expect(amounts[0]).toBe(33.33);
    expect(amounts[2]).toBe(33.34);
  });

  it('يتعامل مع أصغر مبلغ ممكن (0.01)', () => {
    const bens = [makeBen('a', 100)];
    const result = calculateDistributions(bens, 0.01);
    expect(result[0]!.share_amount).toBe(0.01);
    expect(result[0]!.net_amount).toBe(0.01);
  });

  it('سلف = الحصة بالضبط → net=0, deficit=0', () => {
    const bens = [makeBen('a', 100)];
    const result = calculateDistributions(bens, 500, { a: 500 });
    const a = result[0]!;
    expect(a.share_amount).toBe(500);
    expect(a.net_amount).toBe(0);
    expect(a.deficit).toBe(0);
  });
});
