/**
 * Integration tests: Full financial pipeline from income → expenses → shares → distributions.
 * Simulates realistic Waqf fiscal year scenarios using useComputedFinancials.
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useComputedFinancials } from '@/hooks/useComputedFinancials';
import type { Income, Expense } from '@/types/database';
import type { Tables } from '@/integrations/supabase/types';

// ─── Factories ───

let seq = 0;
const id = () => `id-${++seq}`;

const mkIncome = (source: string, amount: number, date = '2024-06-01'): Income => ({
  id: id(), source, amount, date, created_at: date,
});

const mkExpense = (type: string, amount: number, desc?: string): Expense => ({
  id: id(), expense_type: type, amount, date: '2024-06-01', created_at: '2024-06-01',
  description: desc ?? null,
});

const mkAccount = (overrides: Partial<Tables<'accounts'>> = {}): Tables<'accounts'> => ({
  id: id(),
  fiscal_year: '1446-1447',
  total_income: 0,
  total_expenses: 0,
  net_after_expenses: 0,
  net_after_vat: 0,
  admin_share: 0,
  waqif_share: 0,
  waqf_revenue: 0,
  waqf_capital: 0,
  vat_amount: 0,
  zakat_amount: 0,
  distributions_amount: 0,
  waqf_corpus_manual: 0,
  waqf_corpus_previous: 0,
  fiscal_year_id: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

const compute = (params: Parameters<typeof useComputedFinancials>[0]) =>
  renderHook(() => useComputedFinancials(params)).result.current;

// ─── Scenario 1: Full dynamic pipeline (no saved account) ───

describe('Integration: Full dynamic financial pipeline', () => {
  const income: Income[] = [
    mkIncome('إيجار', 120000),
    mkIncome('إيجار', 80000),
    mkIncome('أخرى', 10000),
  ];
  // Total income = 210,000

  const expenses: Expense[] = [
    mkExpense('صيانة', 15000),
    mkExpense('كهرباء', 5000),
    mkExpense('مياه', 2000),
    mkExpense('عمالة', 8000),
    mkExpense('رسوم منصة إيجار', 3000),
    mkExpense('كتابة عقود', 2000),
  ];
  // Total expenses = 35,000

  it('computes full hierarchy with default percentages (10% admin, 5% waqif)', () => {
    const r = compute({ income, expenses, accounts: [], settings: null });

    expect(r.totalIncome).toBe(210000);
    expect(r.totalExpenses).toBe(35000);
    expect(r.grandTotal).toBe(210000); // no carry-forward
    expect(r.netAfterExpenses).toBe(175000); // 210000 - 35000
    expect(r.netAfterVat).toBe(175000); // no VAT
    expect(r.netAfterZakat).toBe(175000); // no zakat

    // shareBase = income - expenses - zakat = 210000 - 35000 - 0 = 175000
    expect(r.shareBase).toBe(175000);
    expect(r.adminShare).toBe(17500); // 10%
    expect(r.waqifShare).toBe(8750); // 5%

    // waqfRevenue = netAfterZakat - adminShare - waqifShare = 175000 - 17500 - 8750
    expect(r.waqfRevenue).toBe(148750);
    expect(r.availableAmount).toBe(148750); // no corpus manual
    expect(r.remainingBalance).toBe(148750); // no distributions
  });

  it('correctly groups income by source', () => {
    const r = compute({ income, expenses, accounts: [], settings: null });
    expect(r.incomeBySource).toEqual({ 'إيجار': 200000, 'أخرى': 10000 });
  });

  it('correctly groups expenses by type', () => {
    const r = compute({ income, expenses, accounts: [], settings: null });
    expect(r.expensesByType).toEqual({
      'صيانة': 15000, 'كهرباء': 5000, 'مياه': 2000,
      'عمالة': 8000, 'رسوم منصة إيجار': 3000, 'كتابة عقود': 2000,
    });
  });
});

// ─── Scenario 2: Saved account with VAT, Zakat, carry-forward, distributions ───

describe('Integration: Saved account with full deductions', () => {
  const income = [mkIncome('إيجار', 200000)];
  const expenses = [mkExpense('صيانة', 30000)];

  const account = mkAccount({
    fiscal_year: '1446-1447',
    total_income: 200000,
    total_expenses: 30000,
    net_after_expenses: 180000, // 200000 + 10000(prev) - 30000
    vat_amount: 10000,
    net_after_vat: 170000,
    zakat_amount: 5000,
    admin_share: 16500, // 10% of (200000 - 30000 - 5000 = 165000)
    waqif_share: 8250,  // 5% of 165000
    waqf_revenue: 140250, // (170000 - 5000) - 16500 - 8250
    waqf_corpus_previous: 10000,
    waqf_corpus_manual: 20000,
    distributions_amount: 50000,
  });

  it('follows full hierarchy: Income → Expenses → VAT → Zakat → Shares → Distributions', () => {
    const r = compute({
      income, expenses,
      accounts: [account],
      settings: null,
      fiscalYearLabel: '1446-1447',
    });

    // Step 1: Totals
    expect(r.totalIncome).toBe(200000);
    expect(r.totalExpenses).toBe(30000);

    // Step 2: Grand total includes carry-forward
    expect(r.grandTotal).toBe(210000); // 200000 + 10000

    // Step 3: From saved account
    expect(r.netAfterExpenses).toBe(180000);
    expect(r.vatAmount).toBe(10000);
    expect(r.netAfterVat).toBe(170000);

    // Step 4: Zakat
    expect(r.zakatAmount).toBe(5000);
    expect(r.netAfterZakat).toBe(165000); // 170000 - 5000

    // Step 5: Shares (from saved account)
    expect(r.adminShare).toBe(16500);
    expect(r.waqifShare).toBe(8250);

    // Step 6: Waqf revenue
    expect(r.waqfRevenue).toBe(140250);

    // Step 7: Corpus manual deduction
    expect(r.waqfCorpusManual).toBe(20000);
    expect(r.availableAmount).toBe(120250); // 140250 - 20000

    // Step 8: Distributions
    expect(r.distributionsAmount).toBe(50000);
    expect(r.remainingBalance).toBe(70250); // 120250 - 50000
  });

  it('share base excludes carry-forward (uses income only)', () => {
    const r = compute({
      income, expenses,
      accounts: [account],
      settings: null,
      fiscalYearLabel: '1446-1447',
    });

    // shareBase = totalIncome - totalExpenses - zakat = 200000 - 30000 - 5000
    expect(r.shareBase).toBe(165000);
  });
});

// ─── Scenario 3: Custom percentages ───

describe('Integration: Custom admin/waqif percentages', () => {
  it('applies 15% admin and 8% waqif from settings', () => {
    const income = [mkIncome('إيجار', 100000)];
    const expenses = [mkExpense('صيانة', 10000)];
    const settings = { admin_share_percentage: '15', waqif_share_percentage: '8' };

    const r = compute({ income, expenses, accounts: [], settings });

    // shareBase = 100000 - 10000 = 90000
    expect(r.adminShare).toBe(13500); // 15% of 90000
    expect(r.waqifShare).toBe(7200);  // 8% of 90000
    expect(r.waqfRevenue).toBe(90000 - 13500 - 7200); // 69300
  });
});

// ─── Scenario 4: Carry-forward between fiscal years ───

describe('Integration: Carry-forward between fiscal years', () => {
  it('waqf_corpus_manual from year 1 becomes waqf_corpus_previous in year 2', () => {
    // Year 1: admin sets corpus_manual = 25000
    const year1Account = mkAccount({
      fiscal_year: '1445-1446',
      waqf_revenue: 100000,
      waqf_corpus_manual: 25000,
    });
    const r1 = compute({
      income: [mkIncome('إيجار', 150000)],
      expenses: [],
      accounts: [year1Account],
      settings: null,
      fiscalYearLabel: '1445-1446',
    });
    expect(r1.waqfCorpusManual).toBe(25000);
    expect(r1.availableAmount).toBe(75000); // 100000 - 25000

    // Year 2: that 25000 appears as waqf_corpus_previous
    const year2Account = mkAccount({
      fiscal_year: '1446-1447',
      waqf_corpus_previous: 25000, // carried from year 1
      net_after_expenses: 195000,
      net_after_vat: 195000,
      admin_share: 17000,
      waqif_share: 8500,
      waqf_revenue: 169500,
      waqf_corpus_manual: 0,
      distributions_amount: 0,
    });
    const r2 = compute({
      income: [mkIncome('إيجار', 170000)],
      expenses: [],
      accounts: [year2Account],
      settings: null,
      fiscalYearLabel: '1446-1447',
    });

    expect(r2.waqfCorpusPrevious).toBe(25000);
    expect(r2.grandTotal).toBe(195000); // 170000 + 25000
  });
});

// ─── Scenario 5: VAT expense excluded from grouping ───

describe('Integration: VAT handling in expense grouping', () => {
  it('includes VAT in expensesByType but excludes from expensesByTypeExcludingVat', () => {
    const expenses = [
      mkExpense('صيانة', 10000),
      mkExpense('ضريبة', 15000, 'ضريبة القيمة المضافة المحصلة من الهيئة'),
      mkExpense('كهرباء', 5000),
    ];

    const r = compute({ income: [mkIncome('إيجار', 100000)], expenses, accounts: [], settings: null });

    expect(r.expensesByType['ضريبة']).toBe(15000);
    expect(r.expensesByTypeExcludingVat['ضريبة']).toBeUndefined();
    expect(Object.keys(r.expensesByTypeExcludingVat)).toEqual(['صيانة', 'كهرباء']);
  });
});

// ─── Scenario 6: Zero income (maintenance-only year) ───

describe('Integration: Zero income year', () => {
  it('handles a year with only expenses and no income', () => {
    const expenses = [mkExpense('صيانة', 5000)];
    const r = compute({ income: [], expenses, accounts: [], settings: null });

    expect(r.totalIncome).toBe(0);
    expect(r.totalExpenses).toBe(5000);
    expect(r.netAfterExpenses).toBe(-5000);
    expect(r.adminShare).toBe(-500); // 10% of -5000
    expect(r.waqfRevenue).toBe(-4250); // -5000 - (-500) - (-250)
  });
});
