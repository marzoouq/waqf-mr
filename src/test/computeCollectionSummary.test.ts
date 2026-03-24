import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeCollectionSummary } from '@/utils/dashboardComputations';

describe('computeCollectionSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15'));
  });
  afterEach(() => vi.useRealTimers());

  it('يحسب العقود النشطة فقط', () => {
    const contracts = [
      { id: 'c1', status: 'active' },
      { id: 'c2', status: 'draft' },
    ];
    const invoices = [
      { contract_id: 'c1', due_date: '2025-06-01', amount: 1000, paid_amount: 1000, status: 'paid' },
      { contract_id: 'c2', due_date: '2025-06-01', amount: 500, paid_amount: 0, status: 'pending' },
    ];
    const result = computeCollectionSummary(contracts, invoices);
    expect(result.paidCount).toBe(1);
    expect(result.total).toBe(1);
    expect(result.totalExpected).toBe(1000);
    expect(result.totalCollected).toBe(1000);
    expect(result.percentage).toBe(100);
  });

  it('يشمل العقود المنتهية في الحساب', () => {
    const contracts = [
      { id: 'c1', status: 'active' },
      { id: 'c2', status: 'expired' },
    ];
    const invoices = [
      { contract_id: 'c1', due_date: '2025-06-01', amount: 1000, paid_amount: 1000, status: 'paid' },
      { contract_id: 'c2', due_date: '2025-05-01', amount: 2000, paid_amount: 0, status: 'pending' },
    ];
    const result = computeCollectionSummary(contracts, invoices);
    expect(result.total).toBe(2);
    expect(result.paidCount).toBe(1);
    expect(result.unpaidCount).toBe(1);
    expect(result.totalExpected).toBe(3000);
    expect(result.totalCollected).toBe(1000);
  });

  it('يتعامل مع الفواتير المدفوعة جزئياً', () => {
    const contracts = [{ id: 'c1', status: 'active' }];
    const invoices = [
      { contract_id: 'c1', due_date: '2025-06-01', amount: 1000, paid_amount: 600, status: 'partially_paid' },
    ];
    const result = computeCollectionSummary(contracts, invoices);
    expect(result.partialCount).toBe(1);
    expect(result.totalCollected).toBe(600);
    expect(result.percentage).toBe(60);
  });

  it('يُعيد أصفاراً مع فواتير فارغة', () => {
    const contracts = [{ id: 'c1', status: 'active' }];
    const result = computeCollectionSummary(contracts, []);
    expect(result.total).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.totalExpected).toBe(0);
    expect(result.totalCollected).toBe(0);
  });

  it('يتجاهل فواتير لم يحِن موعد استحقاقها', () => {
    const contracts = [{ id: 'c1', status: 'active' }];
    const invoices = [
      { contract_id: 'c1', due_date: '2025-12-01', amount: 1000, paid_amount: 0, status: 'pending' },
    ];
    const result = computeCollectionSummary(contracts, invoices);
    expect(result.total).toBe(0);
  });
});
