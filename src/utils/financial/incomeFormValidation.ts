/**
 * تحقق نموذج الدخل — دالة نقية بدون toast/supabase (التزام lib vs utils).
 * مركّز المنطق المكرر بين useIncomePage وأي مستهلك آخر.
 */
import { z } from 'zod';
import { MAX_FINANCIAL_AMOUNT, MAX_FINANCIAL_AMOUNT_MESSAGE } from '@/constants/limits';

export interface IncomeFormInput {
  source: string;
  amount: string;
  date: string;
  property_id: string;
  notes: string;
}

export interface IncomeFormParsed {
  source: string;
  amount: number;
  date: string;
  property_id?: string;
  notes?: string;
}

export type IncomeValidationResult =
  | { success: true; data: IncomeFormParsed }
  | { success: false; error: string };

const incomeFormSchema = z.object({
  source: z
    .string()
    .trim()
    .min(1, { message: 'يرجى ملء جميع الحقول المطلوبة' })
    .max(200, { message: 'المصدر يجب ألا يتجاوز 200 حرف' }),
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
  notes: z
    .string()
    .max(500, { message: 'الملاحظات يجب ألا تتجاوز 500 حرف' })
    .optional()
    .default(''),
});

export type IncomeFieldErrors = Partial<Record<keyof IncomeFormInput, string>>;

export function getIncomeFieldErrors(input: IncomeFormInput): IncomeFieldErrors {
  const parsed = incomeFormSchema.safeParse(input);
  if (parsed.success) return {};
  const errors: IncomeFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof IncomeFormInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export function validateIncomeForm(input: IncomeFormInput): IncomeValidationResult {
  const parsed = incomeFormSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? 'بيانات غير صالحة' };
  }
  const { source, amount, date, property_id, notes } = parsed.data;
  return {
    success: true,
    data: {
      source: source.trim(),
      amount: parseFloat(amount),
      date,
      property_id: property_id || undefined,
      notes: notes ? notes : undefined,
    },
  };
}

