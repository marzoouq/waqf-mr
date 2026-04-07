/**
 * دوال تحويل مصفوفات الملخصات المالية إلى Records
 * مُستخرجة من عدة هوكات لمنع التكرار
 */
import { safeNumber } from '@/utils/format/safeNumber';

/** تحويل مصفوفة source/total إلى Record */
export function toSourceRecord(arr: Array<{ source: string; total: number }>): Record<string, number> {
  const rec: Record<string, number> = {};
  for (const item of arr) rec[item.source] = safeNumber(item.total);
  return rec;
}

/** تحويل مصفوفة expense_type/total إلى Record */
export function toExpenseRecord(arr: Array<{ expense_type: string; total: number }>): Record<string, number> {
  const rec: Record<string, number> = {};
  for (const item of arr) rec[item.expense_type] = safeNumber(item.total);
  return rec;
}
