/**
 * اختبار انحدار: لا يجب أن يظهر حقل المبلغ أو الوصف مكرراً في النموذج.
 * كان سابقاً يحتوي على عنصرَي `<Input>` لنفس الحقل (تم إصلاحه).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExpenseFormDialog from '../ExpenseFormDialog';
import type { ExpenseFormInput } from '@/utils/financial/expenseFormValidation';

const baseProps = {
  isOpen: true,
  setIsOpen: vi.fn(),
  formData: { expense_type: '', amount: '', date: '', property_id: '', description: '' } as ExpenseFormInput,
  setFormData: vi.fn(),
  isEditing: false,
  isPending: false,
  properties: [],
  onSubmit: vi.fn(),
  onReset: vi.fn(),
};

describe('ExpenseFormDialog — regression', () => {
  it('يعرض حقل المبلغ مرة واحدة فقط', () => {
    render(<ExpenseFormDialog {...baseProps} />);
    const amountInputs = document.querySelectorAll('input[name="amount"]');
    expect(amountInputs.length).toBe(1);
  });

  it('يعرض حقل الوصف مرة واحدة فقط', () => {
    render(<ExpenseFormDialog {...baseProps} />);
    const descInputs = document.querySelectorAll('input[name="description"]');
    expect(descInputs.length).toBe(1);
  });

  it('يعرض حقل التاريخ مرة واحدة فقط', () => {
    render(<ExpenseFormDialog {...baseProps} />);
    const dateInputs = document.querySelectorAll('input[name="date"]');
    expect(dateInputs.length).toBe(1);
  });

  it('يبرز حقل المبلغ عند وجود خطأ', () => {
    render(<ExpenseFormDialog {...baseProps} errors={{ amount: 'مطلوب' }} />);
    const input = screen.getByLabelText(/المبلغ/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('مطلوب')).toBeInTheDocument();
  });
});
