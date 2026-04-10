/**
 * حسابات الأداء الشهري — pure utility لاستخراج المنطق من المكوّن
 */
import { safeNumber } from '@/utils/format/safeNumber';

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export interface MonthlyEntry {
  income: number;
  expenses: number;
  month: number;
  year: number;
  name: string;
  net: number;
  label: string;
}

export interface MonthlyTotals {
  income: number;
  expenses: number;
  net: number;
}

interface DateAmount {
  date: string;
  amount: number;
}

/** تجميع الدخل والمصروفات حسب الشهر */
export function aggregateMonthlyData(income: DateAmount[], expenses: DateAmount[]): MonthlyEntry[] {
  const monthMap = new Map<string, { income: number; expenses: number; month: number; year: number }>();

  for (const item of income) {
    const d = new Date(item.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const existing = monthMap.get(key) || { income: 0, expenses: 0, month: d.getMonth(), year: d.getFullYear() };
    existing.income += safeNumber(item.amount);
    monthMap.set(key, existing);
  }

  for (const item of expenses) {
    const d = new Date(item.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const existing = monthMap.get(key) || { income: 0, expenses: 0, month: d.getMonth(), year: d.getFullYear() };
    existing.expenses += safeNumber(item.amount);
    monthMap.set(key, existing);
  }

  return Array.from(monthMap.values())
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map(item => ({
      ...item,
      name: MONTH_NAMES[item.month]!,
      net: item.income - item.expenses,
      label: `${MONTH_NAMES[item.month]!} ${item.year}`,
    }));
}

/** حساب الإجماليات */
export function calcMonthlyTotals(data: MonthlyEntry[]): MonthlyTotals {
  return data.reduce(
    (acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      net: acc.net + m.net,
    }),
    { income: 0, expenses: 0, net: 0 },
  );
}

/** أفضل شهر حسب الصافي */
export function findBestMonth(data: MonthlyEntry[]): MonthlyEntry | null {
  if (data.length === 0) return null;
  return data.reduce((best, m) => m.net > best.net ? m : best, data[0]!);
}

/** أضعف شهر حسب الصافي */
export function findWorstMonth(data: MonthlyEntry[]): MonthlyEntry | null {
  if (data.length === 0) return null;
  return data.reduce((worst, m) => m.net < worst.net ? m : worst, data[0]!);
}

export { MONTH_NAMES };
