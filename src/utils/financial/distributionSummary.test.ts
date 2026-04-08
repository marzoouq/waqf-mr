import { describe, it, expect } from 'vitest';
import { filterDistributionsByFiscalYear, summarizeDistributions } from './distributionSummary';

const mkDist = (status: string, amount: number, fiscal_year_id = 'fy-1') => ({
  status,
  amount,
  fiscal_year_id,
});

describe('filterDistributionsByFiscalYear', () => {
  const dists = [
    mkDist('paid', 100, 'fy-1'),
    mkDist('pending', 200, 'fy-2'),
    mkDist('paid', 300, 'fy-1'),
  ];

  it('يُرجع كل التوزيعات عند وجود حساب', () => {
    expect(filterDistributionsByFiscalYear(dists, true)).toEqual(dists);
  });

  it('يُصفّي حسب السنة المالية عند عدم وجود حساب', () => {
    const result = filterDistributionsByFiscalYear(dists, false, 'fy-1');
    expect(result).toHaveLength(2);
    expect(result.every(d => d.fiscal_year_id === 'fy-1')).toBe(true);
  });

  it('يُرجع مصفوفة فارغة عند "all" بدون حساب', () => {
    expect(filterDistributionsByFiscalYear(dists, false, 'all')).toEqual([]);
  });

  it('يُرجع مصفوفة فارغة بدون حساب وبدون سنة محددة', () => {
    expect(filterDistributionsByFiscalYear(dists, false)).toEqual([]);
    expect(filterDistributionsByFiscalYear(dists, false, null)).toEqual([]);
  });
});

describe('summarizeDistributions', () => {
  it('يحسب المبالغ المدفوعة والمعلقة بشكل صحيح', () => {
    const dists = [
      mkDist('paid', 100),
      mkDist('pending', 200),
      mkDist('paid', 50),
      mkDist('cancelled', 999),
    ];
    const { totalReceived, pendingAmount } = summarizeDistributions(dists);
    expect(totalReceived).toBe(150);
    expect(pendingAmount).toBe(200);
  });

  it('يُرجع أصفاراً لمصفوفة فارغة', () => {
    const { totalReceived, pendingAmount } = summarizeDistributions([]);
    expect(totalReceived).toBe(0);
    expect(pendingAmount).toBe(0);
  });
});
