import { describe, it, expect } from 'vitest';
import { computeLowIncomeMonths } from './incomeAnomalies';

describe('computeLowIncomeMonths', () => {
  it('returns empty array when fewer than 3 records', () => {
    expect(computeLowIncomeMonths([])).toEqual([]);
    expect(computeLowIncomeMonths([{ date: '2024-01-15', amount: 1000 }])).toEqual([]);
    expect(computeLowIncomeMonths([
      { date: '2024-01-15', amount: 1000 },
      { date: '2024-02-15', amount: 1000 },
    ])).toEqual([]);
  });

  it('returns empty array when all records fall in the same month', () => {
    const result = computeLowIncomeMonths([
      { date: '2024-01-05', amount: 1000 },
      { date: '2024-01-15', amount: 2000 },
      { date: '2024-01-25', amount: 3000 },
    ]);
    expect(result).toEqual([]);
  });

  it('detects months below 20% of average', () => {
    // Avg = (10000 + 9000 + 500) / 3 ≈ 6500 ⇒ threshold = 1300
    const result = computeLowIncomeMonths([
      { date: '2024-01-15', amount: 10000 },
      { date: '2024-02-15', amount: 9000 },
      { date: '2024-03-15', amount: 500 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ month: '2024-03', amount: 500 });
    expect(result[0].avg).toBe(6500);
  });

  it('handles string amounts via safeNumber', () => {
    const result = computeLowIncomeMonths([
      { date: '2024-01-15', amount: '10000' as unknown as number },
      { date: '2024-02-15', amount: '9000' as unknown as number },
      { date: '2024-03-15', amount: '500' as unknown as number },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2024-03');
  });

  it('returns empty when no month is below threshold', () => {
    const result = computeLowIncomeMonths([
      { date: '2024-01-15', amount: 5000 },
      { date: '2024-02-15', amount: 6000 },
      { date: '2024-03-15', amount: 5500 },
    ]);
    expect(result).toEqual([]);
  });

  it('aggregates multiple records in the same month', () => {
    // Jan = 9000, Feb = 9000, Mar = 500 ⇒ avg = 6166 ⇒ threshold ≈ 1233
    const result = computeLowIncomeMonths([
      { date: '2024-01-05', amount: 5000 },
      { date: '2024-01-25', amount: 4000 },
      { date: '2024-02-15', amount: 9000 },
      { date: '2024-03-15', amount: 500 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2024-03');
  });
});
