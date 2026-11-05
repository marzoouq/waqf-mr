import { describe, it, expect } from 'vitest';
import { filterByYearRange } from './yearScope';

const year = { start_date: '2025-10-25', end_date: '2026-10-24' };
const items = [
  { id: 'before', d: '2025-10-24' },
  { id: 'first', d: '2025-10-25T08:00:00Z' },
  { id: 'last', d: '2026-10-24' },
  { id: 'after', d: '2026-10-25' },
  { id: 'none', d: null },
];

describe('filterByYearRange', () => {
  it('keeps only records inside 25/10/2025 – 24/10/2026', () => {
    expect(filterByYearRange(items, (i) => i.d, year).map((i) => i.id)).toEqual(['first', 'last']);
  });
  it('"all years" shows every record including undated', () => {
    expect(filterByYearRange(items, (i) => i.d, null)).toHaveLength(5);
  });
});
