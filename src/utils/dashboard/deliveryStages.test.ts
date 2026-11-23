import { describe, it, expect } from 'vitest';
import { buildDeliveryStages } from './deliveryStages';

describe('buildDeliveryStages', () => {
  it('active year: only the year stage is done', () => {
    const s = buildDeliveryStages({ isClosed: false, fiscalYearId: 'fy1', distributions: [] });
    expect(s.map((x) => x.done)).toEqual([true, false, false]);
  });

  it('delivery counts only a paid distribution of the same year', () => {
    const s = buildDeliveryStages({
      isClosed: true,
      fiscalYearId: 'fy2',
      distributions: [{ amount: 100, date: '2025-10-25', status: 'paid', fiscal_year_id: 'fy1' }],
    });
    expect(s[1]?.done).toBe(true);
    expect(s[2]?.done).toBe(false);
  });

  it('closed year with a paid distribution shows delivered with its date', () => {
    const s = buildDeliveryStages({
      isClosed: true,
      fiscalYearId: 'fy2',
      distributions: [
        { amount: 5, date: '2026-11-04', status: 'paid', fiscal_year_id: 'fy2' },
        { amount: 5, date: '2026-11-01', status: 'pending', fiscal_year_id: 'fy2' },
      ],
    });
    expect(s[2]).toMatchObject({ done: true, date: '2026-11-04' });
  });
});
