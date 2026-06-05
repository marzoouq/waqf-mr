import { describe, it, expect } from 'vitest';
import { validateExpenseForm } from './expenseFormValidation';

const base = { expense_type: 'صيانة', amount: '500', date: '2025-01-15', property_id: '', description: '' };

describe('validateExpenseForm', () => {
  it('ينجح مع بيانات صحيحة', () => {
    const r = validateExpenseForm(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.amount).toBe(500);
  });

  it('يفشل إذا كان النوع فارغاً', () => {
    const r = validateExpenseForm({ ...base, expense_type: '' });
    expect(r.success).toBe(false);
  });

  it('يفشل إذا كان المبلغ صفراً', () => {
    const r = validateExpenseForm({ ...base, amount: '0' });
    expect(r.success).toBe(false);
  });

  it('يفشل إذا تجاوز الحد الأقصى', () => {
    const r = validateExpenseForm({ ...base, amount: '1000000000' });
    expect(r.success).toBe(false);
  });

  it('يفشل مع تاريخ مفقود', () => {
    const r = validateExpenseForm({ ...base, date: '' });
    expect(r.success).toBe(false);
  });

  it('يمرر الحقول الاختيارية', () => {
    const r = validateExpenseForm({ ...base, property_id: 'abc', description: 'وصف' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.property_id).toBe('abc');
      expect(r.data.description).toBe('وصف');
    }
  });
});

import { getExpenseFieldErrors } from './expenseFormValidation';

describe('getExpenseFieldErrors', () => {
  it('يُرجع خريطة فارغة عند النجاح', () => {
    expect(getExpenseFieldErrors(base)).toEqual({});
  });
  it('يُرجع أخطاء متعددة', () => {
    const e = getExpenseFieldErrors({ expense_type: '', amount: '0', date: 'bad', property_id: '', description: '' });
    expect(e.expense_type).toBeTruthy();
    expect(e.amount).toBeTruthy();
    expect(e.date).toBeTruthy();
  });
});
