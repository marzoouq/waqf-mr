import { describe, it, expect } from 'vitest';
import {
  calculateFinancials,
  groupIncomeBySource,
  groupExpensesByType,
  computeTotals,
} from './accountsCalculations';
import { Income, Expense } from '@/types/database';

// Helper to create minimal Income/Expense records
const mkIncome = (amount: number, source = 'إيجارات'): Income =>
  ({ amount, source } as Income);

const mkExpense = (amount: number, expense_type = 'صيانة'): Expense =>
  ({ amount, expense_type } as Expense);

describe('calculateFinancials – التسلسل المالي الهرمي', () => {
  const base = {
    totalIncome: 120_000,
    totalExpenses: 30_000,
    waqfCorpusPrevious: 10_000,
    manualVat: 5_000,
    zakatAmount: 2_000,
    adminPercent: 10,
    waqifPercent: 5,
    waqfCorpusManual: 3_000,
    manualDistributions: 8_000,
  };

  it('يحسب الإجمالي الشامل = إيرادات + رصيد مرحل', () => {
    const r = calculateFinancials(base);
    expect(r.grandTotal).toBe(130_000); // 120k + 10k
  });

  it('يحسب الصافي بعد المصروفات', () => {
    const r = calculateFinancials(base);
    expect(r.netAfterExpenses).toBe(100_000); // 130k - 30k
  });

  it('يحسب الصافي بعد الضريبة', () => {
    const r = calculateFinancials(base);
    expect(r.netAfterVat).toBe(95_000); // 100k - 5k
  });

  it('يحسب الصافي بعد الزكاة', () => {
    const r = calculateFinancials(base);
    expect(r.netAfterZakat).toBe(93_000); // 95k - 2k
  });

  it('أساس الحصص = إيرادات - مصروفات - زكاة (بدون مرحل وبدون ضريبة)', () => {
    const r = calculateFinancials(base);
    expect(r.shareBase).toBe(88_000); // 120k - 30k - 2k
  });

  it('حصة الناظر 10% من أساس الحصص', () => {
    const r = calculateFinancials(base);
    expect(r.adminShare).toBe(8_800); // 88k * 10%
  });

  it('حصة الواقف 5% من أساس الحصص', () => {
    const r = calculateFinancials(base);
    expect(r.waqifShare).toBe(4_400); // 88k * 5%
  });

  it('ريع الوقف = صافي بعد الزكاة - حصة الناظر - حصة الواقف', () => {
    const r = calculateFinancials(base);
    expect(r.waqfRevenue).toBe(79_800); // 93k - 8.8k - 4.4k
  });

  it('المبلغ القابل للتوزيع = ريع الوقف - رقبة الوقف', () => {
    const r = calculateFinancials(base);
    expect(r.availableAmount).toBe(76_800); // 79.8k - 3k
  });

  it('الرصيد المتبقي = القابل للتوزيع - التوزيعات', () => {
    const r = calculateFinancials(base);
    expect(r.remainingBalance).toBe(68_800); // 76.8k - 8k
  });

  it('كل المدخلات صفرية تعيد أصفار', () => {
    const r = calculateFinancials({
      totalIncome: 0, totalExpenses: 0, waqfCorpusPrevious: 0,
      manualVat: 0, zakatAmount: 0, adminPercent: 10, waqifPercent: 5,
      waqfCorpusManual: 0, manualDistributions: 0,
    });
    expect(r.grandTotal).toBe(0);
    expect(r.shareBase).toBe(0);
    expect(r.adminShare).toBe(0);
    expect(r.waqfRevenue).toBe(0);
    expect(r.remainingBalance).toBe(0);
  });
});

describe('groupIncomeBySource – تجميع الدخل حسب المصدر', () => {
  it('يجمع سجلات بنفس المصدر', () => {
    const result = groupIncomeBySource([
      mkIncome(50_000, 'إيجارات'),
      mkIncome(70_000, 'إيجارات'),
      mkIncome(10_000, 'استثمارات'),
    ]);
    expect(result['إيجارات']).toBe(120_000);
    expect(result['استثمارات']).toBe(10_000);
  });

  it('يتعامل مع مصدر غير محدد', () => {
    const result = groupIncomeBySource([
      { amount: 5_000, source: null } as unknown as Income,
    ]);
    expect(result['غير محدد']).toBe(5_000);
  });

  it('مصفوفة فارغة تعيد كائن فارغ', () => {
    expect(groupIncomeBySource([])).toEqual({});
  });
});

describe('groupExpensesByType – تجميع المصروفات حسب النوع', () => {
  it('يجمع حسب النوع', () => {
    const result = groupExpensesByType([
      mkExpense(3_000, 'كهرباء'),
      mkExpense(2_000, 'كهرباء'),
      mkExpense(5_000, 'صيانة'),
    ]);
    expect(result['كهرباء']).toBe(5_000);
    expect(result['صيانة']).toBe(5_000);
  });

  it('يتعامل مع نوع غير محدد', () => {
    const result = groupExpensesByType([
      { amount: 1_000, expense_type: null } as unknown as Expense,
    ]);
    expect(result['غير محدد']).toBe(1_000);
  });

  it('مصفوفة فارغة تعيد كائن فارغ', () => {
    expect(groupExpensesByType([])).toEqual({});
  });
});

describe('computeTotals – حساب الإجماليات', () => {
  it('يحسب إجمالي الدخل والمصروفات', () => {
    const { totalIncome, totalExpenses } = computeTotals(
      [mkIncome(50_000), mkIncome(70_000)],
      [mkExpense(10_000), mkExpense(20_000)],
    );
    expect(totalIncome).toBe(120_000);
    expect(totalExpenses).toBe(30_000);
  });

  it('مصفوفات فارغة تعيد أصفار', () => {
    const { totalIncome, totalExpenses } = computeTotals([], []);
    expect(totalIncome).toBe(0);
    expect(totalExpenses).toBe(0);
  });
});
