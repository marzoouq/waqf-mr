/**
 * كشف الأشهر ذات الإيرادات المنخفضة بشكل غير طبيعي
 * (مُستخرج من useIncomePage في الموجة 18)
 *
 * القاعدة: شهر يُعتبر "منخفض" إذا كان إجماليه أقل من 20% من متوسط الأشهر.
 */
import { safeNumber } from '@/utils/format/safeNumber';

export interface IncomeRecord {
  date: string;
  amount: number | string;
}

export interface LowIncomeMonth {
  month: string;
  amount: number;
  avg: number;
}

/** الحد الأدنى من الأشهر اللازمة للحساب */
const MIN_MONTHS_FOR_ANOMALY = 2;
/** عتبة 20% من المتوسط */
const LOW_THRESHOLD_RATIO = 0.2;
/** أقل عدد سجلات قبل اعتبار التحليل ذا معنى */
const MIN_INCOME_RECORDS = 3;

/**
 * يحسب الأشهر التي يكون فيها إجمالي الدخل أقل من 20% من المتوسط الشهري.
 * يُرجع مصفوفة فارغة إذا كانت العينة صغيرة جداً.
 */
export function computeLowIncomeMonths(income: IncomeRecord[]): LowIncomeMonth[] {
  if (income.length < MIN_INCOME_RECORDS) return [];

  const monthMap = new Map<string, number>();
  for (const item of income) {
    const month = item.date.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + safeNumber(item.amount));
  }

  if (monthMap.size < MIN_MONTHS_FOR_ANOMALY) return [];

  const values = Array.from(monthMap.values());
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const threshold = avg * LOW_THRESHOLD_RATIO;
  const roundedAvg = Math.round(avg);

  return Array.from(monthMap.entries())
    .filter(([, amount]) => amount < threshold)
    .map(([month, amount]) => ({ month, amount, avg: roundedAvg }));
}
