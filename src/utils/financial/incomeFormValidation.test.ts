import { describe, it, expect } from 'vitest';
import { validateIncomeForm } from './incomeFormValidation';

const base = { source: 'إيجار', amount: '1000', date: '2025-01-15', property_id: '', notes: '' };

describe('validateIncomeForm', () => {
  it('ينجح مع بيانات صحيحة', () => {
    const r = validateIncomeForm(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.amount).toBe(1000);
      expect(r.data.property_id).toBeUndefined();
      expect(r.data.notes).toBeUndefined();
    }
  });

  it('يفشل إذا كان المصدر فارغاً', () => {
    const r = validateIncomeForm({ ...base, source: '   ' });
    expect(r.success).toBe(false);
  });

  it('يفشل إذا كان المبلغ سالباً', () => {
    const r = validateIncomeForm({ ...base, amount: '-5' });
    expect(r.success).toBe(false);
  });

  it('يفشل إذا تجاوز المبلغ الحد', () => {
    const r = validateIncomeForm({ ...base, amount: '9999999999' });
    expect(r.success).toBe(false);
  });

  it('يفشل مع تاريخ غير صالح', () => {
    const r = validateIncomeForm({ ...base, date: '15/01/2025' });
    expect(r.success).toBe(false);
  });

  it('يمرر الحقول الاختيارية', () => {
    const r = validateIncomeForm({ ...base, property_id: 'abc', notes: 'ملاحظة' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.property_id).toBe('abc');
      expect(r.data.notes).toBe('ملاحظة');
    }
  });
});

import { getIncomeFieldErrors } from './incomeFormValidation';

describe('getIncomeFieldErrors', () => {
  it('يُرجع خريطة فارغة عند النجاح', () => {
    expect(getIncomeFieldErrors(base)).toEqual({});
  });
  it('يُرجع أخطاء متعددة الحقول دفعة واحدة', () => {
    const e = getIncomeFieldErrors({ source: '', amount: '-1', date: '', property_id: '', notes: '' });
    expect(e.source).toBeTruthy();
    expect(e.amount).toBeTruthy();
    expect(e.date).toBeTruthy();
  });
});
