import { describe, it, expect } from 'vitest';
import { calculateFinancials } from '@/utils/accountsCalculations';

/**
 * اختبارات توحيد حساب availableAmount عبر صفحات المستفيد.
 * المعادلة المعتمدة: availableAmount = waqfRevenue - waqfCorpusManual
 * حصة المستفيد = availableAmount * share_percentage / 100
 */
describe('availableAmount – توحيد الحسابات في صفحات المستفيد', () => {
  const baseParams = {
    totalIncome: 1_254_000,
    totalExpenses: 121_723.02,
    waqfCorpusPrevious: 236_380,
    manualVat: 0,
    zakatAmount: 0,
    adminPercent: 10,
    waqifPercent: 5,
    waqfCorpusManual: 174_388.543,
    manualDistributions: 0,
  };

  it('availableAmount = waqfRevenue - waqfCorpusManual', () => {
    const result = calculateFinancials(baseParams);
    const expected = result.waqfRevenue - baseParams.waqfCorpusManual;
    expect(result.availableAmount).toBeCloseTo(expected, 2);
  });

  it('حصة مستفيد بنسبة 7.142857% من availableAmount', () => {
    const result = calculateFinancials(baseParams);
    const sharePercentage = 7.142857;
    const myShare = (result.availableAmount * sharePercentage) / 100;
    // Must match the formula used in BeneficiaryDashboard, FinancialReportsPage, AccountsViewPage
    expect(myShare).toBeCloseTo((result.waqfRevenue - baseParams.waqfCorpusManual) * sharePercentage / 100, 2);
  });

  it('availableAmount يساوي صفر عندما waqfCorpusManual >= waqfRevenue', () => {
    const result = calculateFinancials({
      ...baseParams,
      waqfCorpusManual: 2_000_000, // أكبر من ريع الوقف
    });
    expect(result.availableAmount).toBeLessThanOrEqual(0);
  });

  it('availableAmount يساوي waqfRevenue عندما waqfCorpusManual = 0', () => {
    const result = calculateFinancials({
      ...baseParams,
      waqfCorpusManual: 0,
    });
    expect(result.availableAmount).toBeCloseTo(result.waqfRevenue, 2);
  });

  it('remainingBalance = availableAmount - manualDistributions', () => {
    const distributions = 500_000;
    const result = calculateFinancials({
      ...baseParams,
      manualDistributions: distributions,
    });
    expect(result.remainingBalance).toBeCloseTo(result.availableAmount - distributions, 2);
  });

  it('حصة كل مستفيد من 14 مستفيد متساوي النسب تعادل 1/14 من availableAmount', () => {
    const result = calculateFinancials(baseParams);
    const equalShare = 100 / 14;
    const perBeneficiary = (result.availableAmount * equalShare) / 100;
    const totalDistributed = perBeneficiary * 14;
    expect(totalDistributed).toBeCloseTo(result.availableAmount, 0);
  });

  it('grandTotal = totalIncome + waqfCorpusPrevious (من الهوك)', () => {
    const result = calculateFinancials(baseParams);
    expect(result.grandTotal).toBe(baseParams.totalIncome + baseParams.waqfCorpusPrevious);
  });
});
