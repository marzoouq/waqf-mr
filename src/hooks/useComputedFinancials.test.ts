import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useComputedFinancials } from './useComputedFinancials';
import type { Income, Expense } from '@/types/database';
import type { Tables } from '@/integrations/supabase/types';

// ─── Helpers ───

const mkIncome = (overrides: Partial<Income> = {}): Income => ({
  id: crypto.randomUUID(),
  source: 'إيجار',
  amount: 10000,
  date: '2024-01-01',
  created_at: '2024-01-01',
  ...overrides,
});

const mkExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: crypto.randomUUID(),
  expense_type: 'صيانة',
  amount: 2000,
  date: '2024-01-01',
  created_at: '2024-01-01',
  ...overrides,
});

const mkAccount = (overrides: Partial<Tables<'accounts'>> = {}): Tables<'accounts'> => ({
  id: crypto.randomUUID(),
  fiscal_year: '1446-1447',
  total_income: 100000,
  total_expenses: 20000,
  net_after_expenses: 80000,
  net_after_vat: 75000,
  admin_share: 7500,
  waqif_share: 3750,
  waqf_revenue: 60000,
  waqf_capital: 0,
  vat_amount: 5000,
  zakat_amount: 3750,
  distributions_amount: 0,
  waqf_corpus_manual: 0,
  waqf_corpus_previous: 0,
  created_at: '2024-01-01',
  fiscal_year_id: null,
  updated_at: '2024-01-01',
  ...overrides,
});

const render = (params: Parameters<typeof useComputedFinancials>[0]) =>
  renderHook(() => useComputedFinancials(params)).result.current;

// ─── Tests ───

describe('useComputedFinancials', () => {
  // ─── Edge: Empty data ───
  describe('empty data', () => {
    it('returns all zeros when no income/expenses/accounts', () => {
      const r = render({ income: [], expenses: [], accounts: [], settings: null });
      expect(r.totalIncome).toBe(0);
      expect(r.totalExpenses).toBe(0);
      expect(r.grandTotal).toBe(0);
      expect(r.netAfterExpenses).toBe(0);
      expect(r.adminShare).toBe(0);
      expect(r.waqfRevenue).toBe(0);
      expect(r.availableAmount).toBe(0);
      expect(r.remainingBalance).toBe(0);
      expect(r.currentAccount).toBeNull();
    });

    it('returns empty groupings', () => {
      const r = render({ income: [], expenses: [], accounts: [], settings: null });
      expect(r.incomeBySource).toEqual({});
      expect(r.expensesByType).toEqual({});
      expect(r.expensesByTypeExcludingVat).toEqual({});
    });
  });

  // ─── Dynamic calculation (no saved account) with forceClosedMode ───
  describe('dynamic calculation (no saved account)', () => {
    it('calculates with default percentages (10% admin, 5% waqif)', () => {
      const income = [mkIncome({ amount: 100000 })];
      const expenses = [mkExpense({ amount: 20000 })];
      const r = render({ income, expenses, accounts: [], settings: null, forceClosedMode: true });

      expect(r.totalIncome).toBe(100000);
      expect(r.totalExpenses).toBe(20000);
      expect(r.grandTotal).toBe(100000);
      expect(r.netAfterExpenses).toBe(80000);
      expect(r.shareBase).toBe(80000);
      expect(r.adminShare).toBe(8000);
      expect(r.waqifShare).toBe(4000);
    });

    it('uses custom admin/waqif percentages from settings', () => {
      const income = [mkIncome({ amount: 100000 })];
      const expenses = [mkExpense({ amount: 20000 })];
      const settings = { admin_share_percentage: '15', waqif_share_percentage: '8' };
      const r = render({ income, expenses, accounts: [], settings, forceClosedMode: true });

      expect(r.adminShare).toBe(12000);
      expect(r.waqifShare).toBe(6400);
    });

    it('handles multiple income sources and expense types', () => {
      const income = [
        mkIncome({ source: 'إيجار', amount: 50000 }),
        mkIncome({ source: 'إيجار', amount: 30000 }),
        mkIncome({ source: 'أخرى', amount: 20000 }),
      ];
      const expenses = [
        mkExpense({ expense_type: 'صيانة', amount: 5000 }),
        mkExpense({ expense_type: 'كهرباء', amount: 3000 }),
      ];
      const r = render({ income, expenses, accounts: [], settings: null });

      expect(r.totalIncome).toBe(100000);
      expect(r.totalExpenses).toBe(8000);
      expect(r.incomeBySource).toEqual({ 'إيجار': 80000, 'أخرى': 20000 });
      expect(r.expensesByType).toEqual({ 'صيانة': 5000, 'كهرباء': 3000 });
    });
  });

  // ─── Saved account (currentAccount) ───
  describe('saved account', () => {
    it('uses saved account values when fiscal year label matches (closed year)', () => {
      const account = mkAccount({ fiscal_year: '1446-1447', waqf_revenue: 60000 });
      const r = render({
        income: [mkIncome({ amount: 100000 })],
        expenses: [mkExpense({ amount: 20000 })],
        accounts: [account],
        settings: null,
        fiscalYearLabel: '1446-1447',
        fiscalYearStatus: 'closed',
      });

      expect(r.currentAccount).toBe(account);
      expect(r.adminShare).toBe(7500);
      expect(r.waqfRevenue).toBe(60000);
    });

    it('returns null currentAccount when fiscal year label does not match', () => {
      const account = mkAccount({ fiscal_year: '1445-1446' });
      const r = render({
        income: [mkIncome({ amount: 50000 })],
        expenses: [],
        accounts: [account],
        settings: null,
        fiscalYearLabel: '1446-1447',
      });

      expect(r.currentAccount).toBeNull();
      expect(r.totalIncome).toBe(50000);
    });

    it('picks single account when no fiscalYearLabel provided', () => {
      const account = mkAccount();
      const r = render({
        income: [],
        expenses: [],
        accounts: [account],
        settings: null,
      });

      expect(r.currentAccount).toBe(account);
    });

    it('returns null when multiple accounts and no fiscalYearLabel', () => {
      const r = render({
        income: [],
        expenses: [],
        accounts: [mkAccount({ fiscal_year: 'A' }), mkAccount({ fiscal_year: 'B' })],
        settings: null,
      });

      expect(r.currentAccount).toBeNull();
    });
  });

  // ─── Zakat, VAT, waqf corpus ───
  describe('deductions from saved account', () => {
    it('applies zakat and VAT from saved account', () => {
      const account = mkAccount({
        vat_amount: 5000,
        zakat_amount: 2000,
        net_after_expenses: 80000,
        net_after_vat: 75000,
      });
      const r = render({
        income: [mkIncome({ amount: 100000 })],
        expenses: [mkExpense({ amount: 20000 })],
        accounts: [account],
        settings: null,
        fiscalYearLabel: '1446-1447',
        fiscalYearStatus: 'closed',
      });

      expect(r.vatAmount).toBe(5000);
      expect(r.zakatAmount).toBe(2000);
      expect(r.netAfterVat).toBe(75000);
      expect(r.netAfterZakat).toBe(73000);
    });

    it('handles waqf corpus previous (grandTotal includes it)', () => {
      const account = mkAccount({ waqf_corpus_previous: 10000, net_after_expenses: 90000 });
      const r = render({
        income: [mkIncome({ amount: 100000 })],
        expenses: [mkExpense({ amount: 20000 })],
        accounts: [account],
        settings: null,
        fiscalYearLabel: '1446-1447',
        fiscalYearStatus: 'closed',
      });

      expect(r.waqfCorpusPrevious).toBe(10000);
      expect(r.grandTotal).toBe(110000);
    });

    it('deducts waqf corpus manual from available amount', () => {
      const account = mkAccount({ waqf_revenue: 60000, waqf_corpus_manual: 15000 });
      const r = render({
        income: [mkIncome({ amount: 100000 })],
        expenses: [],
        accounts: [account],
        settings: null,
        fiscalYearLabel: '1446-1447',
        fiscalYearStatus: 'closed',
      });

      expect(r.waqfCorpusManual).toBe(15000);
      expect(r.availableAmount).toBe(45000);
    });

    it('deducts distributions from remaining balance', () => {
      const account = mkAccount({
        waqf_revenue: 60000,
        waqf_corpus_manual: 10000,
        distributions_amount: 20000,
      });
      const r = render({
        income: [],
        expenses: [],
        accounts: [account],
        settings: null,
        fiscalYearLabel: '1446-1447',
        fiscalYearStatus: 'closed',
      });

      expect(r.distributionsAmount).toBe(20000);
      expect(r.availableAmount).toBe(50000);
      expect(r.remainingBalance).toBe(30000);
    });
  });

  // ─── VAT exclusion in expense grouping ───
  describe('expense grouping excluding VAT', () => {
    it('filters out VAT description from expensesByTypeExcludingVat', () => {
      const expenses = [
        mkExpense({ expense_type: 'صيانة', amount: 5000 }),
        mkExpense({ expense_type: 'ضريبة', amount: 3000, description: 'ضريبة القيمة المضافة المحصلة من الهيئة' }),
        mkExpense({ expense_type: 'كهرباء', amount: 2000 }),
      ];
      const r = render({ income: [], expenses, accounts: [], settings: null });

      expect(r.expensesByType).toEqual({ 'صيانة': 5000, 'ضريبة': 3000, 'كهرباء': 2000 });
      expect(r.expensesByTypeExcludingVat).toEqual({ 'صيانة': 5000, 'كهرباء': 2000 });
    });

    it('returns same result when no VAT expense exists', () => {
      const expenses = [mkExpense({ expense_type: 'صيانة', amount: 5000 })];
      const r = render({ income: [], expenses, accounts: [], settings: null });

      expect(r.expensesByType).toEqual(r.expensesByTypeExcludingVat);
    });
  });

  // ─── Edge: negative values ───
  describe('edge cases', () => {
    it('handles expenses exceeding income (negative net) — shareBase clamped to 0', () => {
      const income = [mkIncome({ amount: 10000 })];
      const expenses = [mkExpense({ amount: 50000 })];
      const r = render({ income, expenses, accounts: [], settings: null, forceClosedMode: true });

      expect(r.netAfterExpenses).toBe(-40000);
      // shareBase = Math.max(0, 10000 - 50000) = 0
      expect(r.shareBase).toBe(0);
      expect(r.adminShare).toBe(0);
    });

    it('handles zero percentages', () => {
      const settings = { admin_share_percentage: '0', waqif_share_percentage: '0' };
      const income = [mkIncome({ amount: 100000 })];
      const expenses = [mkExpense({ amount: 20000 })];
      const r = render({ income, expenses, accounts: [], settings, forceClosedMode: true });

      expect(r.adminShare).toBe(0);
      expect(r.waqifShare).toBe(0);
      expect(r.waqfRevenue).toBe(0);
    });

    it('falls back to default 10% admin when setting is invalid text', () => {
      const settings = { admin_share_percentage: 'abc', waqif_share_percentage: '' };
      const r = render({ income: [mkIncome({ amount: 100000 })], expenses: [], accounts: [], settings, forceClosedMode: true });

      expect(r.adminPct).toBe(10);
      expect(r.waqifPct).toBe(5);
      expect(r.adminShare).toBe(10000);
    });

    it('falls back to default when setting is Infinity', () => {
      const settings = { admin_share_percentage: 'Infinity', waqif_share_percentage: '-Infinity' };
      const r = render({ income: [mkIncome({ amount: 100000 })], expenses: [], accounts: [], settings });

      expect(r.adminPct).toBe(10);
      expect(r.waqifPct).toBe(5);
    });

    it('accepts valid numeric string settings', () => {
      const settings = { admin_share_percentage: '15', waqif_share_percentage: '7.5' };
      const r = render({ income: [mkIncome({ amount: 100000 })], expenses: [], accounts: [], settings });

      expect(r.adminPct).toBe(15);
      expect(r.waqifPct).toBe(7.5);
    });

    it('handles income with missing source (defaults to غير محدد)', () => {
      const income = [mkIncome({ source: '' })];
      const r = render({ income, expenses: [], accounts: [], settings: null });

      expect(r.incomeBySource).toEqual({ 'غير محدد': 10000 });
    });
  });
});
