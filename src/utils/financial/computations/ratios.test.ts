import { describe, it, expect } from 'vitest';
import { computeExpenseRatio, EXPENSE_RATIO_FULL_DEFICIT, isExpenseDeficit } from './ratios';

describe('computeExpenseRatio', () => {
  it('returns 0 when both income and expenses are zero', () => {
    expect(computeExpenseRatio(0, 0)).toBe(0);
  });

  it('returns full-deficit sentinel when income is 0 and expenses > 0', () => {
    expect(computeExpenseRatio(0, 5000)).toBe(EXPENSE_RATIO_FULL_DEFICIT);
    expect(computeExpenseRatio(-100, 5000)).toBe(EXPENSE_RATIO_FULL_DEFICIT);
  });

  it('returns rounded percentage when income > 0', () => {
    expect(computeExpenseRatio(1000, 500)).toBe(50);
    expect(computeExpenseRatio(1000, 1500)).toBe(150);
    expect(computeExpenseRatio(300, 100)).toBe(33);
  });

  it('isExpenseDeficit detects deficit', () => {
    expect(isExpenseDeficit(50)).toBe(false);
    expect(isExpenseDeficit(100)).toBe(false);
    expect(isExpenseDeficit(101)).toBe(true);
    expect(isExpenseDeficit(EXPENSE_RATIO_FULL_DEFICIT)).toBe(true);
  });
});
