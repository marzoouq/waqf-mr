/**
 * تحقق نموذج العقد — دالة نقية بدون toast/supabase (التزام lib vs utils).
 * استُخرج من useContractFormSubmit في المرحلة 1.2.
 */
import type { ContractFormData } from '@/types/forms/contract';

export type ContractValidationError = { field: keyof ContractFormData | 'form'; message: string };

export function validateContractForm(data: ContractFormData): ContractValidationError | null {
  if (!data.start_date || !data.end_date || data.end_date <= data.start_date) {
    return { field: 'end_date', message: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية' };
  }

  const rent = parseFloat(data.rent_amount);
  if (!Number.isFinite(rent) || rent <= 0) {
    return { field: 'rent_amount', message: 'قيمة الإيجار يجب أن تكون رقماً موجباً' };
  }

  if (data.payment_type !== 'upfront') {
    const count = parseInt(data.payment_count, 10);
    if (!Number.isFinite(count) || count < 1) {
      return { field: 'payment_count', message: 'عدد الدفعات يجب أن يكون 1 أو أكثر' };
    }
  }

  if (data.rental_mode === 'multi' && data.selected_unit_ids.length === 0) {
    return { field: 'selected_unit_ids', message: 'يجب اختيار وحدة واحدة على الأقل في وضع التأجير المتعدد' };
  }

  return null;
}
