import { describe, it, expect } from 'vitest';
import { getPaymentCount, getPaymentTypeLabel } from './contractHelpers';

describe('getPaymentCount', () => {
  it('يعيد 12 للشهري', () => {
    expect(getPaymentCount({ payment_type: 'monthly' })).toBe(12);
  });
  it('يعيد 4 للربع سنوي', () => {
    expect(getPaymentCount({ payment_type: 'quarterly' })).toBe(4);
  });
  it('يعيد 2 للنصف سنوي (semi_annual)', () => {
    expect(getPaymentCount({ payment_type: 'semi_annual' })).toBe(2);
  });
  it('يعيد 2 للنصف سنوي (semi-annual)', () => {
    expect(getPaymentCount({ payment_type: 'semi-annual' })).toBe(2);
  });
  it('يعيد 1 للسنوي', () => {
    expect(getPaymentCount({ payment_type: 'annual' })).toBe(1);
  });
  it('يعيد payment_count للنوع غير المعروف', () => {
    expect(getPaymentCount({ payment_type: 'custom', payment_count: 6 })).toBe(6);
  });
  it('يعيد 1 عند عدم وجود payment_count', () => {
    expect(getPaymentCount({ payment_type: null })).toBe(1);
  });
});

describe('getPaymentTypeLabel', () => {
  it('شهري', () => expect(getPaymentTypeLabel('monthly')).toBe('شهري'));
  it('ربع سنوي', () => expect(getPaymentTypeLabel('quarterly')).toBe('ربع سنوي'));
  it('نصف سنوي', () => expect(getPaymentTypeLabel('semi_annual')).toBe('نصف سنوي'));
  it('سنوي', () => expect(getPaymentTypeLabel('annual')).toBe('سنوي'));
  it('متعدد للقيمة غير المعروفة', () => expect(getPaymentTypeLabel('xyz')).toBe('متعدد'));
  it('متعدد لـ null', () => expect(getPaymentTypeLabel(null)).toBe('متعدد'));
  it('متعدد لـ undefined', () => expect(getPaymentTypeLabel(undefined)).toBe('متعدد'));
});
