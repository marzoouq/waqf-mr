/**
 * دوال مساعدة لتحويل بيانات مقارنة السنوات المالية
 * مُستخرجة من useYearComparisonData لسهولة الاختبار
 */
import { safeNumber } from '@/utils/format/safeNumber';

export interface MonthlyEntry {
  month: number;
  total: number;
}

export interface ExpenseTypeEntry {
  expense_type: string;
  total: number;
}

/** بناء خريطة شهرية من مصفوفة month/total */
export function toMonthMap(entries: MonthlyEntry[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const e of entries) {
    // تحويل 1-12 → 0-11 للتوافق مع JS Date.getMonth()
    map.set(e.month - 1, safeNumber(e.total));
  }
  return map;
}

/** تحويل مصفوفة expense_type/total إلى Record */
export function toExpenseRecord(entries: ExpenseTypeEntry[]): Record<string, number> {
  const rec: Record<string, number> = {};
  for (const e of entries) {
    rec[e.expense_type] = safeNumber(e.total);
  }
  return rec;
}
