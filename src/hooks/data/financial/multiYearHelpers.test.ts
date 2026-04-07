import { describe, it, expect } from 'vitest';
import { mapEntry, type RpcYearEntry } from './multiYearHelpers';

const makeEntry = (overrides: Partial<RpcYearEntry> = {}): RpcYearEntry => ({
  year_id: 'fy-1',
  label: '1446-1447',
  status: 'closed',
  total_income: 100000,
  total_expenses: 30000,
  account: {
    vat_amount: 5000,
    zakat_amount: 2000,
    admin_share: 3000,
    waqif_share: 1000,
    waqf_revenue: 59000,
    net_after_expenses: 70000,
    net_after_vat: 65000,
    distributions_amount: 50000,
    waqf_corpus_manual: 10000,
    waqf_corpus_previous: 5000,
  },
  expenses_by_type: [
    { expense_type: 'صيانة', total: 20000 },
    { expense_type: 'تأمين', total: 10000 },
  ],
  ...overrides,
});

describe('mapEntry', () => {
  it('يحوّل بيانات RPC لـ YearSummaryEntry بشكل صحيح', () => {
    const result = mapEntry(makeEntry());
    expect(result.yearId).toBe('fy-1');
    expect(result.label).toBe('1446-1447');
    expect(result.totalIncome).toBe(100000);
    expect(result.totalExpenses).toBe(30000);
    expect(result.vatAmount).toBe(5000);
    expect(result.zakatAmount).toBe(2000);
    expect(result.adminShare).toBe(3000);
    expect(result.waqifShare).toBe(1000);
    expect(result.waqfRevenue).toBe(59000);
    expect(result.distributionsAmount).toBe(50000);
    // المتاح = ريع الوقف − رقبة الوقف المُخصصة يدوياً
    expect(result.availableAmount).toBe(49000); // 59000 - 10000
  });

  it('يتعامل مع account = null', () => {
    const result = mapEntry(makeEntry({ account: null }));
    expect(result.vatAmount).toBe(0);
    expect(result.waqfRevenue).toBe(0);
    expect(result.availableAmount).toBe(0);
    expect(result.distributionsAmount).toBe(0);
  });

  it('يحوّل expenses_by_type لـ Record', () => {
    const result = mapEntry(makeEntry());
    expect(result.expensesByType).toEqual({
      'صيانة': 20000,
      'تأمين': 10000,
    });
  });

  it('يتعامل مع expenses_by_type فارغة', () => {
    const result = mapEntry(makeEntry({ expenses_by_type: [] }));
    expect(Object.keys(result.expensesByType)).toHaveLength(0);
  });

  it('المتاح للتوزيع = 0 عند تساوي ريع الوقف ورقبة الوقف', () => {
    const result = mapEntry(makeEntry({
      account: {
        ...makeEntry().account!,
        waqf_revenue: 50000,
        waqf_corpus_manual: 50000,
      },
    }));
    expect(result.availableAmount).toBe(0);
  });
});
