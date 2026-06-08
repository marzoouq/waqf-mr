import { describe, it, expect } from 'vitest';
import {
  filterDistributionsByFiscalYear,
  summarizeDistributions,
} from '@/utils/financial/distributionSummary';

const paid = (amount: number, fy = 'fy-1') => ({ status: 'paid', amount, fiscal_year_id: fy });
const pend = (amount: number, fy = 'fy-1') => ({ status: 'pending', amount, fiscal_year_id: fy });
const other = (amount: number, fy = 'fy-1') => ({ status: 'other', amount, fiscal_year_id: fy });

const list = [paid(100, 'fy-1'), pend(200, 'fy-1'), paid(300, 'fy-2')];

// ════════════════════════════════════════════════════════
// filterDistributionsByFiscalYear
// ════════════════════════════════════════════════════════
describe('filterDistributionsByFiscalYear', () => {
  it('hasAccount=true → يُرجع الكل بدون تصفية', () => {
    expect(filterDistributionsByFiscalYear(list, true)).toHaveLength(3);
  });

  it('hasAccount=true مع fiscalYearId → يُرجع الكل أيضاً', () => {
    expect(filterDistributionsByFiscalYear(list, true, 'fy-1')).toHaveLength(3);
  });

  it('hasAccount=true مع "all" → يُرجع الكل', () => {
    expect(filterDistributionsByFiscalYear(list, true, 'all')).toHaveLength(3);
  });

  it('hasAccount=false مع fiscalYearId="fy-1" → توزيعات fy-1 فقط', () => {
    const result = filterDistributionsByFiscalYear(list, false, 'fy-1');
    expect(result).toHaveLength(2);
    expect(result.every(d => d.fiscal_year_id === 'fy-1')).toBe(true);
  });

  it('hasAccount=false مع fiscalYearId="fy-2" → توزيعات fy-2 فقط', () => {
    const result = filterDistributionsByFiscalYear(list, false, 'fy-2');
    expect(result).toHaveLength(1);
    expect(result[0]?.amount).toBe(300);
  });

  it('hasAccount=false مع fiscalYearId="fy-999" → مصفوفة فارغة', () => {
    expect(filterDistributionsByFiscalYear(list, false, 'fy-999')).toHaveLength(0);
  });

  it('hasAccount=false مع undefined → مصفوفة فارغة (إصلاح #2)', () => {
    expect(filterDistributionsByFiscalYear(list, false, undefined)).toHaveLength(0);
  });

  it('hasAccount=false مع null → مصفوفة فارغة (إصلاح #2)', () => {
    expect(filterDistributionsByFiscalYear(list, false, null)).toHaveLength(0);
  });

  it('hasAccount=false مع "all" → مصفوفة فارغة (السلوك الحالي)', () => {
    expect(filterDistributionsByFiscalYear(list, false, 'all')).toHaveLength(0);
  });

  it('مصفوفة فارغة كمدخل → مصفوفة فارغة دائماً', () => {
    expect(filterDistributionsByFiscalYear([], false, 'fy-1')).toHaveLength(0);
    expect(filterDistributionsByFiscalYear([], true)).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════
// summarizeDistributions
// ════════════════════════════════════════════════════════
describe('summarizeDistributions', () => {
  it('يحسب totalReceived من paid فقط', () => {
    const { totalReceived } = summarizeDistributions([paid(100), paid(200), pend(50)]);
    expect(totalReceived).toBe(300);
  });

  it('يحسب pendingAmount من pending فقط', () => {
    const { pendingAmount } = summarizeDistributions([paid(100), pend(50), pend(75)]);
    expect(pendingAmount).toBe(125);
  });

  it('يتجاهل الحالات غير المعروفة', () => {
    const { totalReceived, pendingAmount } = summarizeDistributions([other(999), paid(100), pend(50)]);
    expect(totalReceived).toBe(100);
    expect(pendingAmount).toBe(50);
  });

  it('مصفوفة فارغة → أصفار', () => {
    const { totalReceived, pendingAmount } = summarizeDistributions([]);
    expect(totalReceived).toBe(0);
    expect(pendingAmount).toBe(0);
  });

  it('يتعامل مع null/NaN بأمان عبر safeNumber', () => {
    const { totalReceived } = summarizeDistributions([
      { status: 'paid', amount: null as unknown as number },
      { status: 'paid', amount: NaN },
      paid(100),
    ]);
    expect(totalReceived).toBe(100);
  });
});
