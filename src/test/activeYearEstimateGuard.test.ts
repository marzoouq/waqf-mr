import { describe, it, expect } from 'vitest';
import { calculateFinancials } from '@/utils/financial/fiscalYear/accountsCalculations';

// حارس: لوحة حسابات الناظر تعرض ريع الوقف والحصص تقديرياً أثناء السنة النشطة
const p = {
  totalIncome: 1_756_900, totalExpenses: 328_300.29, waqfCorpusPrevious: 0, manualVat: 0,
  zakatAmount: 0, adminPercent: 10, waqifPercent: 5, waqfCorpusManual: 0, manualDistributions: 0,
  isClosed: false,
};

describe('تقدير السنة النشطة (حساب الناظر)', () => {
  it('يحسب الحصص وريع الوقف تقديرياً عند estimateWhenOpen', () => {
    const r = calculateFinancials({ ...p, estimateWhenOpen: true });
    expect(r.adminShare).toBe(142_859.97);
    expect(r.waqifShare).toBe(71_429.99);
    expect(r.waqfRevenue).toBe(1_214_309.75);
    expect(r.availableAmount).toBe(1_214_309.75);
  });
  it('يبقى التصفير افتراضياً لبقية الشاشات (المستفيدين)', () => {
    expect(calculateFinancials(p).waqfRevenue).toBe(0);
  });
});
