import { describe, it, expect } from 'vitest';

/**
 * منطق حساب صافي الحصة — مطابق لـ useMySharePage + DistributeDialog + printShareReport
 * rawNet = myShare - advances - actualCarryforward
 * actualCarryforward = min(carryforward, max(0, myShare - advances))
 */
function computeNetShare(myShare: number, advances: number, carryforward: number) {
  const afterAdvances = Math.max(0, myShare - advances);
  const actualCarryforward = Math.min(carryforward, afterAdvances);
  const rawNet = myShare - advances - actualCarryforward;
  const net = Math.max(0, rawNet);
  const deficit = rawNet < 0 ? Math.round(Math.abs(rawNet) * 100) / 100 : 0;
  return { afterAdvances, actualCarryforward, rawNet, net, deficit };
}

describe('computeNetShare — حساب صافي الحصة', () => {
  it('حالة عادية بدون سلف ولا مرحّل', () => {
    const r = computeNetShare(10000, 0, 0);
    expect(r.net).toBe(10000);
    expect(r.deficit).toBe(0);
    expect(r.actualCarryforward).toBe(0);
  });

  it('خصم سلف فقط', () => {
    const r = computeNetShare(10000, 3000, 0);
    expect(r.net).toBe(7000);
    expect(r.deficit).toBe(0);
  });

  it('خصم مرحّل فقط', () => {
    const r = computeNetShare(10000, 0, 2000);
    expect(r.net).toBe(8000);
    expect(r.actualCarryforward).toBe(2000);
  });

  it('خصم سلف + مرحّل — المرحّل يُخصم بعد السلف', () => {
    const r = computeNetShare(10000, 7000, 5000);
    // afterAdvances = 3000, actualCarryforward = min(5000, 3000) = 3000
    expect(r.afterAdvances).toBe(3000);
    expect(r.actualCarryforward).toBe(3000);
    expect(r.net).toBe(0);
    expect(r.deficit).toBe(0);
  });

  it('حالة عجز — السلف تتجاوز الحصة', () => {
    const r = computeNetShare(5000, 8000, 2000);
    // afterAdvances = 0, actualCarryforward = 0
    // rawNet = 5000 - 8000 - 0 = -3000
    expect(r.afterAdvances).toBe(0);
    expect(r.actualCarryforward).toBe(0);
    expect(r.net).toBe(0);
    expect(r.deficit).toBe(3000);
  });

  it('مرحّل أكبر من المتبقي بعد السلف', () => {
    const r = computeNetShare(10000, 6000, 9000);
    // afterAdvances = 4000, actualCarryforward = min(9000, 4000) = 4000
    expect(r.actualCarryforward).toBe(4000);
    expect(r.net).toBe(0);
    expect(r.deficit).toBe(0);
  });

  it('قيم صفرية', () => {
    const r = computeNetShare(0, 0, 0);
    expect(r.net).toBe(0);
    expect(r.deficit).toBe(0);
  });
});
