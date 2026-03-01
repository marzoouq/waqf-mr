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
    isClosed: true,
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
      waqfCorpusManual: 0, manualDistributions: 0, isClosed: true,
    });
    expect(r.grandTotal).toBe(0);
    expect(r.shareBase).toBe(0);
    expect(r.adminShare).toBe(0);
    expect(r.waqfRevenue).toBe(0);
    expect(r.remainingBalance).toBe(0);
  });

  it('سنة نشطة (isClosed=false) تصفّر الحصص', () => {
    const r = calculateFinancials({ ...base, isClosed: false });
    expect(r.grandTotal).toBe(130_000);
    expect(r.netAfterExpenses).toBe(100_000);
    expect(r.adminShare).toBe(0);
    expect(r.waqifShare).toBe(0);
    expect(r.waqfRevenue).toBe(0);
    expect(r.availableAmount).toBe(0);
    expect(r.remainingBalance).toBe(0);
  });

  it('isClosed افتراضي = true', () => {
    const { isClosed: _, ...withoutClosed } = base;
    const r = calculateFinancials(withoutClosed);
    expect(r.adminShare).toBe(8_800);
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

// ---------------------------------------------------------------------------
// تكامل: محاكاة منطق useFinancialSummary مع حساب مخزن (currentAccount)
// يتحقق من أن القيم المحسوبة ديناميكياً تتطابق مع القراءة المباشرة
// ---------------------------------------------------------------------------
describe('تكامل: تطابق calculateFinancials مع سجل حساب مخزن', () => {
  // بيانات مأخوذة من ملف الإقفال السنوي المدقق
  const storedAccount = {
    total_income: 1_254_000,
    total_expenses: 121_723.02,
    waqf_corpus_previous: 236_380,
    vat_amount: 0,
    zakat_amount: 0,
    admin_share: 113_227.698,
    waqif_share: 56_613.849,
    waqf_revenue: 1_198_815.433,
    waqf_corpus_manual: 174_388.543,
    distributions_amount: 1_024_426.89,
    net_after_expenses: 1_368_656.98,
    net_after_vat: 1_368_656.98,
  };

  const params = {
    totalIncome: storedAccount.total_income,
    totalExpenses: storedAccount.total_expenses,
    waqfCorpusPrevious: storedAccount.waqf_corpus_previous,
    manualVat: storedAccount.vat_amount,
    zakatAmount: storedAccount.zakat_amount,
    adminPercent: 10,
    waqifPercent: 5,
    waqfCorpusManual: storedAccount.waqf_corpus_manual,
    manualDistributions: storedAccount.distributions_amount,
    isClosed: true,
  };

  const result = calculateFinancials(params);

  it('الإجمالي الشامل = إيرادات + مرحل', () => {
    expect(result.grandTotal).toBeCloseTo(
      storedAccount.total_income + storedAccount.waqf_corpus_previous, 2,
    );
  });

  it('صافي بعد المصروفات يطابق المخزن', () => {
    expect(result.netAfterExpenses).toBeCloseTo(storedAccount.net_after_expenses, 2);
  });

  it('صافي بعد الضريبة يطابق المخزن', () => {
    expect(result.netAfterVat).toBeCloseTo(storedAccount.net_after_vat, 2);
  });

  it('حصة الناظر تطابق المخزن', () => {
    expect(result.adminShare).toBeCloseTo(storedAccount.admin_share, 2);
  });

  it('حصة الواقف تطابق المخزن', () => {
    expect(result.waqifShare).toBeCloseTo(storedAccount.waqif_share, 2);
  });

  it('ريع الوقف يطابق المخزن', () => {
    expect(result.waqfRevenue).toBeCloseTo(storedAccount.waqf_revenue, 2);
  });

  it('المبلغ القابل للتوزيع يطابق الحساب', () => {
    expect(result.availableAmount).toBeCloseTo(
      storedAccount.waqf_revenue - storedAccount.waqf_corpus_manual, 2,
    );
  });

  it('الرصيد المتبقي يطابق الحساب', () => {
    expect(result.remainingBalance).toBeCloseTo(
      storedAccount.waqf_revenue - storedAccount.waqf_corpus_manual - storedAccount.distributions_amount, 2,
    );
  });
});

// ---------------------------------------------------------------------------
// حسابات حصص المستفيدين الشرعية (14 مستفيد)
// الزوجات مجتمعات: 1/8 = 12.5%، الباقي 87.5% يوزع 2:1 (ذكر:أنثى)
// 5 أبناء + 7 بنات = 10+7 = 17 حصة → ابن = 87.5/17*2, بنت = 87.5/17
// ---------------------------------------------------------------------------
describe('حسابات حصص المستفيدين الشرعية', () => {
  // النسب الشرعية الدقيقة
  const WIVES_SHARE = 12.5; // 1/8
  const REMAINING = 87.5;   // 7/8
  const TOTAL_PARTS = 17;   // 5*2 + 7*1
  const SON_PERCENT = (REMAINING / TOTAL_PARTS) * 2;   // ~10.294118%
  const DAUGHTER_PERCENT = REMAINING / TOTAL_PARTS;      // ~5.147059%
  const WIFE_PERCENT = WIVES_SHARE / 2;                  // 6.25% لكل زوجة

  it('مجموع نسب جميع المستفيدين = 100%', () => {
    const total = (WIFE_PERCENT * 2) + (SON_PERCENT * 5) + (DAUGHTER_PERCENT * 7);
    expect(total).toBeCloseTo(100, 6);
  });

  it('حظ الذكر ضعف حظ الأنثى بدقة', () => {
    expect(SON_PERCENT / DAUGHTER_PERCENT).toBeCloseTo(2, 10);
  });

  it('الزوجتان مجتمعتان = الثمن (12.5%)', () => {
    expect(WIFE_PERCENT * 2).toBeCloseTo(12.5, 6);
  });

  it('حساب حصة مستفيد من ريع فعلي', () => {
    // بناءً على بيانات الإقفال: ريع الوقف = 1,198,815.433
    // المبلغ القابل للتوزيع = ريع - رقبة يدوية
    const waqfRevenue = 1_198_815.433;
    const waqfCorpusManual = 174_388.543;
    const distributableAmount = waqfRevenue - waqfCorpusManual;

    const sonShare = distributableAmount * (SON_PERCENT / 100);
    const daughterShare = distributableAmount * (DAUGHTER_PERCENT / 100);
    const wifeShare = distributableAmount * (WIFE_PERCENT / 100);

    // التحقق من أن المجموع = المبلغ القابل للتوزيع
    const totalDistributed = (wifeShare * 2) + (sonShare * 5) + (daughterShare * 7);
    expect(totalDistributed).toBeCloseTo(distributableAmount, 2);

    // التحقق من نسبة 2:1
    expect(sonShare / daughterShare).toBeCloseTo(2, 10);
  });

  it('حصص المستفيدين مع مبلغ صفري = صفر للجميع', () => {
    const distributableAmount = 0;
    const sonShare = distributableAmount * (SON_PERCENT / 100);
    expect(sonShare).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// حالات حدية وسلبية
// ---------------------------------------------------------------------------
describe('حالات حدية للحسابات المالية', () => {
  it('مصروفات أكبر من الدخل تعطي أساس حصص سالب', () => {
    const r = calculateFinancials({
      totalIncome: 50_000,
      totalExpenses: 80_000,
      waqfCorpusPrevious: 0,
      manualVat: 0,
      zakatAmount: 0,
      adminPercent: 10,
      waqifPercent: 5,
      waqfCorpusManual: 0,
      manualDistributions: 0,
    });
    expect(r.shareBase).toBe(0); // Math.max(0, ...) clamps negative
    expect(r.adminShare).toBe(0);
  });

  it('نسب حصص صفرية لا تُنتج NaN', () => {
    const r = calculateFinancials({
      totalIncome: 100_000,
      totalExpenses: 10_000,
      waqfCorpusPrevious: 0,
      manualVat: 0,
      zakatAmount: 0,
      adminPercent: 0,
      waqifPercent: 0,
      waqfCorpusManual: 0,
      manualDistributions: 0,
    });
    expect(r.adminShare).toBe(0);
    expect(r.waqifShare).toBe(0);
    expect(Number.isNaN(r.waqfRevenue)).toBe(false);
  });

  it('مبالغ كبيرة جداً تحافظ على الدقة', () => {
    const r = calculateFinancials({
      totalIncome: 999_999_999.99,
      totalExpenses: 100_000_000,
      waqfCorpusPrevious: 50_000_000,
      manualVat: 10_000_000,
      zakatAmount: 5_000_000,
      adminPercent: 10,
      waqifPercent: 5,
      waqfCorpusManual: 20_000_000,
      manualDistributions: 50_000_000,
    });
    expect(r.grandTotal).toBeCloseTo(1_049_999_999.99, 2);
    expect(r.shareBase).toBeCloseTo(894_999_999.99, 2);
    // Verify hierarchy integrity
    expect(r.waqfRevenue).toBeCloseTo(
      r.netAfterZakat - r.adminShare - r.waqifShare, 2
    );
  });

  it('توزيعات أكبر من المتاح تعطي رصيد سالب', () => {
    const r = calculateFinancials({
      totalIncome: 100_000,
      totalExpenses: 10_000,
      waqfCorpusPrevious: 0,
      manualVat: 0,
      zakatAmount: 0,
      adminPercent: 10,
      waqifPercent: 5,
      waqfCorpusManual: 0,
      manualDistributions: 999_999,
    });
    expect(r.remainingBalance).toBeLessThan(0);
  });
});
