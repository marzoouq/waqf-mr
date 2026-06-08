import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeCollectionSummary } from '@/utils/financial/computations/dashboardComputations';

describe('computeCollectionSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15'));
  });
  afterEach(() => vi.useRealTimers());

  it('يحسب فواتير العقود النشطة فقط', () => {
    const invoices = [
      { contract_id: 'c1', due_date: '2025-06-01', amount: 1000, paid_amount: 1000, status: 'paid', contract: { status: 'active' } },
      { contract_id: 'c2', due_date: '2025-06-01', amount: 500, paid_amount: 0, status: 'pending', contract: { status: 'draft' } },
    ];
    const result = computeCollectionSummary(invoices);
    expect(result.paidCount).toBe(1);
    expect(result.total).toBe(1);
    expect(result.totalExpected).toBe(1000);
    expect(result.totalCollected).toBe(1000);
    expect(result.percentage).toBe(100);
  });

  it('يشمل فواتير العقود المنتهية', () => {
    const invoices = [
      { contract_id: 'c1', due_date: '2025-06-01', amount: 1000, paid_amount: 1000, status: 'paid', contract: { status: 'active' } },
      { contract_id: 'c2', due_date: '2025-05-01', amount: 2000, paid_amount: 0, status: 'pending', contract: { status: 'expired' } },
    ];
    const result = computeCollectionSummary(invoices);
    expect(result.total).toBe(2);
    expect(result.paidCount).toBe(1);
    expect(result.unpaidCount).toBe(1);
    expect(result.totalExpected).toBe(3000);
    expect(result.totalCollected).toBe(1000);
  });

  it('يتعامل مع الفواتير المدفوعة جزئياً ويضمها لـ paidLikeCount', () => {
    const invoices = [
      { contract_id: 'c1', due_date: '2025-06-01', amount: 1000, paid_amount: 600, status: 'partially_paid', contract: { status: 'active' } },
    ];
    const result = computeCollectionSummary(invoices);
    expect(result.partialCount).toBe(1);
    expect(result.paidLikeCount).toBe(1);
    expect(result.unpaidCount).toBe(0);
    expect(result.totalCollected).toBe(600);
    expect(result.percentage).toBe(60);
  });

  it('يُعيد أصفاراً مع فواتير فارغة', () => {
    const result = computeCollectionSummary([]);
    expect(result.total).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.totalExpected).toBe(0);
    expect(result.totalCollected).toBe(0);
    expect(result.paidLikeCount).toBe(0);
  });

  it('يتجاهل فواتير لم يحِن موعد استحقاقها', () => {
    const invoices = [
      { contract_id: 'c1', due_date: '2025-12-01', amount: 1000, paid_amount: 0, status: 'pending', contract: { status: 'active' } },
    ];
    const result = computeCollectionSummary(invoices);
    expect(result.total).toBe(0);
  });

  it('يحتسب الفواتير عابرة السنوات (لا يعتمد على فلتر العقود الجانبي)', () => {
    // فاتورة لعقد منتهٍ — لا حاجة لتمرير قائمة العقود؛ المعيار حالة العقد المضمّنة.
    const invoices = [
      { contract_id: 'c-cross-year', due_date: '2025-06-01', amount: 800, paid_amount: 800, status: 'paid', contract: { status: 'expired' } },
    ];
    const result = computeCollectionSummary(invoices);
    expect(result.total).toBe(1);
    expect(result.paidLikeCount).toBe(1);
    expect(result.percentage).toBe(100);
  });
});
