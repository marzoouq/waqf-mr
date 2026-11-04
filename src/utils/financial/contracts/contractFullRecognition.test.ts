import { describe, it, expect } from 'vitest';
import { generatePaymentDueDates } from '@/utils/financial/contracts/contractAllocation';

// حارس: العقد 12 شهراً يبدأ استحقاقه من تاريخ العقد ويُحسب كاملاً دون بتر شهر
describe('contract 12-month full recognition', () => {
  const base = { start_date: '2025-11-01', end_date: '2026-10-31', rent_amount: 16200 };

  it('monthly: first payment on the contract start date, 12 payments inside the contract', () => {
    const dates = generatePaymentDueDates({ ...base, payment_type: 'monthly', payment_count: 12 } as never);
    expect(dates).toHaveLength(12);
    expect(dates[0]).toBe('2025-11-01');
    expect(dates[11]).toBe('2026-10-01');
    expect(dates.every((d) => d <= base.end_date)).toBe(true);
  });

  it('annual: single payment due on the start date', () => {
    expect(generatePaymentDueDates({ ...base, payment_type: 'annual', payment_count: 1 } as never)).toEqual(['2025-11-01']);
  });

  it('quarterly: 4 payments starting at the start date', () => {
    expect(generatePaymentDueDates({ ...base, payment_type: 'quarterly', payment_count: 4 } as never)).toEqual([
      '2025-11-01', '2026-02-01', '2026-05-01', '2026-08-01',
    ]);
  });
});
