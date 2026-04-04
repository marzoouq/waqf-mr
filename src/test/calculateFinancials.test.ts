import { describe, it, expect } from 'vitest';
import { calculateFinancials, computeTotals, groupIncomeBySource, groupExpensesByType } from '@/utils/financial/accountsCalculations';

describe('calculateFinancials — التسلسل المالي الكامل', () => {
  const baseParams = {
    totalIncome: 500_000,
    totalExpenses: 100_000,
    waqfCorpusPrevious: 50_000,
    manualVat: 10_000,
    zakatAmount: 5_000,
    adminPercent: 10,
    waqifPercent: 5,
    waqfCorpusManual: 20_000,
    manualDistributions: 0,
    isClosed: true,
  };

  it('grandTotal = totalIncome + waqfCorpusPrevious', () => {
    const r = calculateFinancials(baseParams);
    expect(r.grandTotal).toBe(550_000);
  });

  it('netAfterExpenses = grandTotal - totalExpenses', () => {
    const r = calculateFinancials(baseParams);
    expect(r.netAfterExpenses).toBe(450_000);
  });

  it('netAfterVat = netAfterExpenses - manualVat', () => {
    const r = calculateFinancials(baseParams);
    expect(r.netAfterVat).toBe(440_000);
  });

  it('netAfterZakat = netAfterVat - zakatAmount', () => {
    const r = calculateFinancials(baseParams);
    expect(r.netAfterZakat).toBe(435_000);
  });

  it('shareBase = max(0, totalIncome - totalExpenses - zakatAmount)', () => {
    const r = calculateFinancials(baseParams);
    expect(r.shareBase).toBe(395_000); // 500k - 100k - 5k
  });

  it('adminShare = shareBase * adminPercent / 100', () => {
    const r = calculateFinancials(baseParams);
    expect(r.adminShare).toBe(39_500);
  });

  it('waqifShare = shareBase * waqifPercent / 100', () => {
    const r = calculateFinancials(baseParams);
    expect(r.waqifShare).toBe(19_750);
  });

  it('waqfRevenue = netAfterZakat - adminShare - waqifShare', () => {
    const r = calculateFinancials(baseParams);
    expect(r.waqfRevenue).toBe(435_000 - 39_500 - 19_750);
  });

  it('availableAmount = waqfRevenue - waqfCorpusManual', () => {
    const r = calculateFinancials(baseParams);
    expect(r.availableAmount).toBe(r.waqfRevenue - 20_000);
  });

  it('remainingBalance = availableAmount - manualDistributions', () => {
    const r = calculateFinancials(baseParams);
    expect(r.remainingBalance).toBe(r.availableAmount);
  });

  it('سنة نشطة (غير مقفلة) تُرجع حصصاً صفرية', () => {
    const r = calculateFinancials({ ...baseParams, isClosed: false });
    expect(r.adminShare).toBe(0);
    expect(r.waqifShare).toBe(0);
    expect(r.waqfRevenue).toBe(0);
    expect(r.availableAmount).toBe(0);
  });

  it('isDeficit = true عند تجاوز المصروفات للإيرادات', () => {
    const r = calculateFinancials({
      ...baseParams,
      totalExpenses: 600_000, // أكبر من الدخل
    });
    expect(r.shareBase).toBe(0); // max(0, ...)
    expect(r.isDeficit).toBe(true);
  });

  it('عدم وجود عجز عند إيرادات كافية', () => {
    const r = calculateFinancials(baseParams);
    expect(r.isDeficit).toBe(false);
  });

  it('يتعامل مع قيم صفرية بالكامل', () => {
    const r = calculateFinancials({
      totalIncome: 0, totalExpenses: 0, waqfCorpusPrevious: 0,
      manualVat: 0, zakatAmount: 0, adminPercent: 0, waqifPercent: 0,
      waqfCorpusManual: 0, manualDistributions: 0, isClosed: true,
    });
    expect(r.grandTotal).toBe(0);
    expect(r.availableAmount).toBe(0);
    expect(r.isDeficit).toBe(false);
  });

  it('توزيعات تخفض remainingBalance', () => {
    const r = calculateFinancials({ ...baseParams, manualDistributions: 100_000 });
    expect(r.remainingBalance).toBe(r.availableAmount - 100_000);
  });
});

describe('computeTotals — مجاميع الإيرادات والمصروفات', () => {
  it('يحسب مجموع الإيرادات والمصروفات', () => {
    const income = [
      { amount: 1000 }, { amount: 2000 }, { amount: 500 },
    ] as any[];
    const expenses = [
      { amount: 300 }, { amount: 700 },
    ] as any[];
    const r = computeTotals(income, expenses);
    expect(r.totalIncome).toBe(3500);
    expect(r.totalExpenses).toBe(1000);
  });

  it('يتعامل مع قوائم فارغة', () => {
    const r = computeTotals([], []);
    expect(r.totalIncome).toBe(0);
    expect(r.totalExpenses).toBe(0);
  });
});

describe('groupIncomeBySource — تجميع الإيرادات بالمصدر', () => {
  it('يجمع إيرادات نفس المصدر', () => {
    const income = [
      { source: 'إيجار', amount: 1000 },
      { source: 'إيجار', amount: 2000 },
      { source: 'استثمار', amount: 500 },
    ] as any[];
    const r = groupIncomeBySource(income);
    expect(r['إيجار']).toBe(3000);
    expect(r['استثمار']).toBe(500);
  });
});

describe('groupExpensesByType — تجميع المصروفات بالنوع', () => {
  it('يجمع مصروفات نفس النوع', () => {
    const expenses = [
      { expense_type: 'صيانة', amount: 500 },
      { expense_type: 'صيانة', amount: 300 },
      { expense_type: 'رواتب', amount: 2000 },
    ] as any[];
    const r = groupExpensesByType(expenses);
    expect(r['صيانة']).toBe(800);
    expect(r['رواتب']).toBe(2000);
  });
});
