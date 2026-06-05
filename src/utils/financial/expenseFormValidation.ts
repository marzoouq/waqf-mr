/**
 * تحقق نموذج المصروف — دالة نقية بدون toast/supabase (التزام lib vs utils).
 */
import { z } from 'zod';
import { MAX_FINANCIAL_AMOUNT, MAX_FINANCIAL_AMOUNT_MESSAGE } from '@/constants/limits';

export interface ExpenseFormInput {
  expense_type: string;
  amount: string;
  date: string;
  property_id: string;
  description: string;
}

export interface ExpenseFormParsed {
  expense_type: string;
  amount: number;
  date: string;
  property_id?: string;
  description?: string;
}

export type ExpenseValidationResult =
  | { success: true; data: ExpenseFormParsed }
  | { success: false; error: string };

const expenseFormSchema = z.object({
  expense_type: z
    .string()
    .trim()
    .min(1, { message: 'يرجى ملء جميع الحقول المطلوبة' })
    .max(200, { message: 'نوع المصروف يجب ألا يتجاوز 200 حرف' }),
  amount: z
    .string()
    .min(1, { message: 'يرجى ملء جميع الحقول المطلوبة' })
    .refine((v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) && n > 0 && n <= MAX_FINANCIAL_AMOUNT;
    }, { message: MAX_FINANCIAL_AMOUNT_MESSAGE }),
  date: z
    .string()
    .min(1, { message: 'يرجى ملء جميع الحقول المطلوبة' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'صيغة التاريخ غير صحيحة' }),
  property_id: z.string().optional().default(''),
  description: z
    .string()
    .max(500, { message: 'الوصف يجب ألا يتجاوز 500 حرف' })
    .optional()
    .default(''),
});

export function validateExpenseForm(input: ExpenseFormInput): ExpenseValidationResult {
  const parsed = expenseFormSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? 'بيانات غير صالحة' };
  }
  const { expense_type, amount, date, property_id, description } = parsed.data;
  return {
    success: true,
    data: {
      expense_type: expense_type.trim(),
      amount: parseFloat(amount),
      date,
      property_id: property_id || undefined,
      description: description ? description : undefined,
    },
  };
}
