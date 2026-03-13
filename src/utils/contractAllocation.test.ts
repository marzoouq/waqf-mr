import { describe, it, expect } from 'vitest';
import { generatePaymentDueDates, allocateContractToFiscalYears, getContractSpanInfo } from './contractAllocation';

const fy2024 = { id: 'fy-2024', label: '2024', start_date: '2024-01-01', end_date: '2024-12-31', status: 'active' as const, published: true, created_at: '' };
const fy2025 = { id: 'fy-2025', label: '2025', start_date: '2025-01-01', end_date: '2025-12-31', status: 'active' as const, published: true, created_at: '' };

describe('generatePaymentDueDates', () => {
  it('يولّد 12 تاريخ للعقد الشهري (12 شهر)', () => {
    const dates = generatePaymentDueDates({
      id: 'c1', start_date: '2024-01-01', end_date: '2025-01-01',
      rent_amount: 12000, payment_type: 'monthly',
    });
    expect(dates).toHaveLength(12);
    expect(dates[0]).toBe('2024-02-01');
  });

  it('يولّد تاريخ واحد للعقد السنوي', () => {
    const dates = generatePaymentDueDates({
      id: 'c2', start_date: '2024-01-01', end_date: '2024-12-31',
      rent_amount: 50000, payment_type: 'annual',
    });
    expect(dates).toHaveLength(1);
  });

  it('يولّد 4 تواريخ للعقد الربع سنوي', () => {
    const dates = generatePaymentDueDates({
      id: 'c3', start_date: '2024-01-01', end_date: '2024-12-31',
      rent_amount: 40000, payment_type: 'quarterly',
    });
    expect(dates).toHaveLength(4);
  });
});

describe('allocateContractToFiscalYears', () => {
  it('يخصص العقد لسنة مالية واحدة', () => {
    const allocations = allocateContractToFiscalYears(
      { id: 'c1', start_date: '2024-01-01', end_date: '2024-12-31', rent_amount: 12000, payment_type: 'monthly' },
      [fy2024, fy2025]
    );
    expect(allocations).toHaveLength(1);
    expect(allocations[0].fiscal_year_id).toBe('fy-2024');
    expect(allocations[0].allocated_payments).toBe(12);
    expect(allocations[0].allocated_amount).toBe(12000);
  });

  it('يوزع عقد يمتد على سنتين ماليتين', () => {
    const allocations = allocateContractToFiscalYears(
      { id: 'c2', start_date: '2024-07-01', end_date: '2025-06-30', rent_amount: 12000, payment_type: 'monthly' },
      [fy2024, fy2025]
    );
    expect(allocations).toHaveLength(2);
    const a2024 = allocations.find(a => a.fiscal_year_id === 'fy-2024');
    const a2025 = allocations.find(a => a.fiscal_year_id === 'fy-2025');
    expect(a2024).toBeDefined();
    expect(a2025).toBeDefined();
    expect((a2024?.allocated_payments ?? 0) + (a2025?.allocated_payments ?? 0)).toBe(12);
  });

  it('يعيد مصفوفة فارغة عند عدم وجود سنوات مالية', () => {
    const allocations = allocateContractToFiscalYears(
      { id: 'c3', start_date: '2024-01-01', end_date: '2024-12-31', rent_amount: 12000, payment_type: 'monthly' },
      []
    );
    expect(allocations).toHaveLength(0);
  });
});

describe('getContractSpanInfo', () => {
  it('يعيد spansMultiple = false لعقد ضمن سنة واحدة', () => {
    const info = getContractSpanInfo(
      { id: 'c1', start_date: '2024-03-01', end_date: '2024-12-31', rent_amount: 10000, payment_type: 'annual' },
      [fy2024]
    );
    expect(info.spansMultiple).toBe(false);
  });

  it('يعيد spansMultiple = true لعقد يمتد على سنتين', () => {
    const info = getContractSpanInfo(
      { id: 'c2', start_date: '2024-07-01', end_date: '2025-06-30', rent_amount: 12000, payment_type: 'monthly' },
      [fy2024, fy2025]
    );
    expect(info.spansMultiple).toBe(true);
    expect(info.allocations.length).toBeGreaterThan(1);
  });
});
