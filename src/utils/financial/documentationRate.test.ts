import { describe, it, expect } from 'vitest';
import { computeDocumentationStats } from './documentationRate';

describe('computeDocumentationStats', () => {
  it('returns zero rate for empty expenses', () => {
    const result = computeDocumentationStats([], []);
    expect(result.documentationRate).toBe(0);
    expect(result.documentedCount).toBe(0);
    expect(result.expenseInvoiceMap.size).toBe(0);
  });

  it('returns 100% when all expenses have invoices', () => {
    const expenses = [{ id: 'e1' }, { id: 'e2' }];
    const invoices = [{ expense_id: 'e1' }, { expense_id: 'e2' }];
    const result = computeDocumentationStats(expenses, invoices);
    expect(result.documentationRate).toBe(100);
    expect(result.documentedCount).toBe(2);
  });

  it('rounds 1/3 to 33%', () => {
    const expenses = [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }];
    const invoices = [{ expense_id: 'e1' }];
    const result = computeDocumentationStats(expenses, invoices);
    expect(result.documentedCount).toBe(1);
    expect(result.documentationRate).toBe(33);
  });

  it('counts multiple invoices for same expense', () => {
    const expenses = [{ id: 'e1' }];
    const invoices = [{ expense_id: 'e1' }, { expense_id: 'e1' }, { expense_id: 'e1' }];
    const result = computeDocumentationStats(expenses, invoices);
    expect(result.expenseInvoiceMap.get('e1')).toBe(3);
    expect(result.documentedCount).toBe(1);
    expect(result.documentationRate).toBe(100);
  });

  it('ignores invoices without expense_id', () => {
    const expenses = [{ id: 'e1' }, { id: 'e2' }];
    const invoices = [{ expense_id: null }, { expense_id: undefined }, { expense_id: 'e1' }];
    const result = computeDocumentationStats(expenses, invoices);
    expect(result.documentedCount).toBe(1);
    expect(result.documentationRate).toBe(50);
  });
});
