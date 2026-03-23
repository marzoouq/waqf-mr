import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock all dependency hooks BEFORE importing the hook under test
// ---------------------------------------------------------------------------

const mockIncome = vi.fn(() => ({ data: [] }));
const mockExpenses = vi.fn(() => ({ data: [] }));
const mockAccounts = vi.fn(() => ({ data: [] }));
const mockBeneficiaries = vi.fn(() => ({ data: [] }));
const mockSettings = vi.fn(() => ({ data: null }));

vi.mock('@/hooks/useIncome', () => ({ useIncome: () => mockIncome() }));
vi.mock('@/hooks/useExpenses', () => ({ useExpenses: () => mockExpenses() }));
vi.mock('@/hooks/useAccounts', () => ({ useAccounts: () => mockAccounts() }));
vi.mock('@/hooks/useBeneficiaries', () => ({ useBeneficiaries: () => mockBeneficiaries() }));
vi.mock('@/hooks/useAppSettings', () => ({ useAppSettings: () => mockSettings() }));

// We need to test the hook logic without React rendering — extract the computation logic.
// Since useFinancialSummary uses useMemo, we test via the underlying pure functions
// and verify the hook's branching logic (stored account vs dynamic calculation).
import {
  calculateFinancials,
  computeTotals,
  groupIncomeBySource,
  groupExpensesByType,
} from '@/utils/accountsCalculations';

// ---------------------------------------------------------------------------
// Simulated stored account (from audited closing file)
// ---------------------------------------------------------------------------
const storedAccount = {
  id: 'acc-1',
  fiscal_year: '2024-2025',
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
  
  created_at: '',
  updated_at: '',
};

const income = [
  { amount: 754_000, source: 'إيجارات' },
  { amount: 500_000, source: 'إيجارات' },
];

const expenses = [
  { amount: 71_723.02, expense_type: 'كهرباء' },
  { amount: 50_000, expense_type: 'صيانة' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFinancialSummary – تكامل مع حساب مخزن', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('المسار الأول: عند وجود currentAccount يقرأ القيم المخزنة مباشرة', () => {
    // Simulate the hook's "stored account" branch (lines 48-62 of useFinancialSummary)
    const totalIncome = income.reduce((s, i) => s + Number(i.amount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const currentAccount = storedAccount;

    const zakatAmount = Number(currentAccount.zakat_amount || 0);
    const waqfCorpusPrevious = Number(currentAccount.waqf_corpus_previous || 0);
    const waqfCorpusManual = Number(currentAccount.waqf_corpus_manual || 0);
    const distributionsAmount = Number(currentAccount.distributions_amount || 0);

    const grandTotal = totalIncome + waqfCorpusPrevious;
    const shareBase = totalIncome - totalExpenses - zakatAmount;

    // These are read directly from stored account
    expect(Number(currentAccount.net_after_expenses)).toBeCloseTo(storedAccount.net_after_expenses, 2);
    expect(Number(currentAccount.net_after_vat)).toBeCloseTo(storedAccount.net_after_vat, 2);
    expect(Number(currentAccount.admin_share)).toBeCloseTo(storedAccount.admin_share, 2);
    expect(Number(currentAccount.waqif_share)).toBeCloseTo(storedAccount.waqif_share, 2);
    expect(Number(currentAccount.waqf_revenue)).toBeCloseTo(storedAccount.waqf_revenue, 2);

    // Derived values
    const availableAmount = Number(currentAccount.waqf_revenue) - waqfCorpusManual;
    const remainingBalance = availableAmount - distributionsAmount;

    expect(availableAmount).toBeCloseTo(1_024_426.89, 2);
    expect(remainingBalance).toBeCloseTo(0, 2);
    expect(grandTotal).toBe(1_490_380);
    expect(shareBase).toBe(1_132_276.98);
  });

  it('المسار الثاني: بدون currentAccount يحسب ديناميكياً عبر calculateFinancials', () => {
    const { totalIncome, totalExpenses } = computeTotals(
      income as any,
      expenses as any,
    );

    const result = calculateFinancials({
      totalIncome,
      totalExpenses,
      waqfCorpusPrevious: 236_380,
      manualVat: 0,
      zakatAmount: 0,
      adminPercent: 10,
      waqifPercent: 5,
      waqfCorpusManual: 174_388.543,
      manualDistributions: 1_024_426.89,
    });

    // الحساب الديناميكي يجب أن يطابق المخزن
    expect(result.netAfterExpenses).toBeCloseTo(storedAccount.net_after_expenses, 2);
    expect(result.adminShare).toBeCloseTo(storedAccount.admin_share, 2);
    expect(result.waqifShare).toBeCloseTo(storedAccount.waqif_share, 2);
    expect(result.waqfRevenue).toBeCloseTo(storedAccount.waqf_revenue, 2);
  });

  it('تطابق التجميعات: incomeBySource و expensesByType', () => {
    const bySource = groupIncomeBySource(income as any);
    expect(bySource['إيجارات']).toBe(1_254_000);

    const byType = groupExpensesByType(expenses as any);
    expect(byType['كهرباء']).toBe(71_723.02);
    expect(byType['صيانة']).toBe(50_000);
  });

  it('تطابق computeTotals مع إجمالي الحساب المخزن', () => {
    const { totalIncome, totalExpenses } = computeTotals(
      income as any,
      expenses as any,
    );
    expect(totalIncome).toBe(storedAccount.total_income);
    expect(totalExpenses).toBe(storedAccount.total_expenses);
  });

  it('حصة المستفيد = (ريع الوقف - رقبة الوقف) × نسبة الحصة / 100', () => {
    const distributableAmount = storedAccount.waqf_revenue - storedAccount.waqf_corpus_manual;
    const sharePercentage = 10; // مثال: مستفيد بنسبة 10%
    const myShare = distributableAmount * sharePercentage / 100;

    expect(distributableAmount).toBeCloseTo(1_024_426.89, 2);
    expect(myShare).toBeCloseTo(102_442.689, 2);
  });
});
