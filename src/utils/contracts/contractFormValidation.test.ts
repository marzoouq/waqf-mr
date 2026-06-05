import { describe, it, expect } from 'vitest';
import { validateContractForm } from './contractFormValidation';
import { emptyFormData } from '@/types/forms/contract';

const base = {
  ...emptyFormData,
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  rent_amount: '12000',
  payment_type: 'monthly',
  payment_count: '12',
  rental_mode: 'single' as const,
};

describe('validateContractForm', () => {
  it('returns null for a valid form', () => {
    expect(validateContractForm(base)).toBeNull();
  });

  it('rejects end_date <= start_date', () => {
    const err = validateContractForm({ ...base, end_date: '2025-01-01' });
    expect(err?.field).toBe('end_date');
  });

  it('rejects non-positive rent_amount', () => {
    expect(validateContractForm({ ...base, rent_amount: '0' })?.field).toBe('rent_amount');
    expect(validateContractForm({ ...base, rent_amount: '-5' })?.field).toBe('rent_amount');
    expect(validateContractForm({ ...base, rent_amount: 'abc' })?.field).toBe('rent_amount');
  });

  it('rejects payment_count < 1 for non-upfront', () => {
    expect(validateContractForm({ ...base, payment_count: '0' })?.field).toBe('payment_count');
  });

  it('allows any payment_count for upfront', () => {
    expect(validateContractForm({ ...base, payment_type: 'upfront', payment_count: '0' })).toBeNull();
  });

  it('rejects multi mode without selected units', () => {
    const err = validateContractForm({ ...base, rental_mode: 'multi', selected_unit_ids: [] });
    expect(err?.field).toBe('selected_unit_ids');
  });
});
