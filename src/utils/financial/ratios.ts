/**
 * computeExpenseRatio — نسبة المصروفات إلى الدخل
 *
 * إصلاح ادعاء الفحص الجنائي: عند `income=0 && expenses>0` كانت النسبة 0
 * فلا تتحقق شروط التنبيه/العجز رغم وجود إنفاق بدون دخل. الآن نعيد قيمة
 * sentinel = `EXPENSE_RATIO_FULL_DEFICIT` (999) ليعالجها العرض كعجز كامل.
 */

/** قيمة sentinel تدل على إنفاق بدون دخل (عجز كامل) */
export const EXPENSE_RATIO_FULL_DEFICIT = 999;

export function computeExpenseRatio(income: number, expenses: number): number {
  if (income <= 0 && expenses > 0) return EXPENSE_RATIO_FULL_DEFICIT;
  if (income <= 0) return 0;
  return Math.round((expenses / income) * 100);
}

/** هل القيمة تمثّل حالة عجز (تجاوز 100% أو إنفاق بلا دخل)؟ */
export const isExpenseDeficit = (ratio: number): boolean => ratio > 100;
