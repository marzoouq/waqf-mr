import { describe, it, expect } from 'vitest';
import { mapEntry, type RpcYearEntry } from './multiYearHelpers';

const makeEntry = (overrides: Partial<RpcYearEntry> = {}): RpcYearEntry => ({
  year_id: 'fy-1',
  label: '2024-2025',
  status: 'active',
  total_income: 100000,
  total_expenses: 20000,
  account: {
    vat_amount: 5000,
    zakat_amount: 2000,
    admin_share: 1000,
    waqif_share: 500,
    waqf_revenue: 70000,
    net_after_expenses: 80000,
    net_after_vat: 75000,
    distributions_amount: 30000,
    waqf_corpus_manual: 10000,
    waqf_corpus_previous: 5000,
  },
  expenses_by_type: [
    { expense_type: 'صيانة', total: 12000 },
    { expense_type: 'رسوم', total: 8000 },
  ],
  ...overrides,
});

describe('mapEntry', () => {
  it('يحوّل صف RPC إلى YearSummaryEntry بشكل صحيح', () => {
    const result = mapEntry(makeEntry());
    expect(result.yearId).toBe('fy-1');
    expect(result.totalIncome).toBe(100000);
    expect(result.waqfRevenue).toBe(70000);
    expect(result.availableAmount).toBe(60000); // 70000 - 10000
    expect(result.expensesByType['صيانة']).toBe(12000);
    expect(result.expensesByType['رسوم']).toBe(8000);
  });

  it('يتعامل مع account=null كصفر', () => {
    const result = mapEntry(makeEntry({ account: null }));
    expect(result.vatAmount).toBe(0);
    expect(result.waqfRevenue).toBe(0);
    expect(result.availableAmount).toBe(0);
  });

  it('يتعامل مع expenses_by_type فارغة', () => {
    const result = mapEntry(makeEntry({ expenses_by_type: [] }));
    expect(result.expensesByType).toEqual({});
  });
});
