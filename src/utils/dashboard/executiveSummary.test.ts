import { describe, it, expect } from 'vitest';
import { buildExecutiveCards } from './executiveSummary';
import type { AggregatedTotals } from '@/types/financial/dashboard';

// أرقام السيناريو المعتمد مع الناظر (السنة 2025-2026)
const totals = {
  total_income: 1_756_900,
  total_expenses: 127_984.44,
  vat_amount: 107_504.82,
  zakat_amount: 0,
  net_after_expenses: 1_736_828.76,
  admin_share: 162_891.56,
  waqif_share: 81_445.78,
  waqf_revenue: 1_384_986.6,
  distributions_amount: 1_000_000,
  available_amount: 1_384_986.6,
  waqf_corpus_manual: 0,
} as AggregatedTotals;

const noYoy = { hasPrevYear: false, prevTotalIncome: 0, prevTotalExpenses: 0 };
const allAmounts = (cards: ReturnType<typeof buildExecutiveCards>) =>
  cards.flatMap((c) => [c.lead?.amount, ...c.rows.map((r) => r.amount)]);

describe('buildExecutiveCards — أرقام اللوحة كما صدرت من الخادم', () => {
  it('ينقل الدخل والمصروفات والضريبة بقيمها الدقيقة', () => {
    const cards = buildExecutiveCards({ totals, isClosed: true, isAdmin: true, yoy: noYoy });
    expect(cards.find((c) => c.id === 'income')?.lead?.amount).toBe(1_756_900);
    const exp = cards.find((c) => c.id === 'expenses');
    expect(exp?.rows.map((r) => r.amount)).toEqual([127_984.44, 107_504.82]);
  });

  it('لا يعرض أبداً مجموع المصروفات مع الضريبة', () => {
    const cards = buildExecutiveCards({ totals, isClosed: true, isAdmin: true, yoy: noYoy });
    expect(cards.find((c) => c.id === 'expenses')?.lead).toBeNull();
    expect(allAmounts(cards)).not.toContain(235_489.26);
  });

  it('السنة المقفلة تعرض ريع الوقف وحصتي الناظر والواقف كما في الإقفال', () => {
    const waqf = buildExecutiveCards({ totals, isClosed: true, isAdmin: true, yoy: noYoy }).find((c) => c.id === 'waqf');
    expect(waqf?.lead?.amount).toBe(1_384_986.6);
    expect(waqf?.rows.map((r) => [r.label, r.amount])).toEqual([['حصة الناظر', 162_891.56], ['حصة الواقف', 81_445.78]]);
  });

  it('السنة النشطة لا تعرض رقماً لريع الوقف قبل الإقفال', () => {
    const waqf = buildExecutiveCards({ totals, isClosed: false, isAdmin: true, yoy: noYoy }).find((c) => c.id === 'waqf');
    expect(waqf?.lead?.amount).toBeNull();
    expect(waqf?.rows[0]?.amount).toBe(1_736_828.76);
  });

  it('المحاسب لا يرى بطاقتي ريع الوقف والتوزيعات', () => {
    const ids = buildExecutiveCards({ totals, isClosed: true, isAdmin: false, yoy: noYoy }).map((c) => c.id);
    expect(ids).toEqual(['income', 'expenses']);
  });
});
