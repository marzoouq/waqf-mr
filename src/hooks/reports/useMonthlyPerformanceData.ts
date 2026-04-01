/**
 * هوك حسابات الأداء الشهري
 */
import { useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export interface MonthlyRow {
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

interface Params {
  income: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
}

export const useMonthlyPerformanceData = ({ income, expenses }: Params) => {
  const monthlyData = useMemo(() => {
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
  }, [income, expenses]);

  const totals = useMemo<MonthlyTotals>(() =>
    monthlyData.reduce(
      (acc, m) => ({ income: acc.income + m.income, expenses: acc.expenses + m.expenses, net: acc.net + m.net }),
      { income: 0, expenses: 0, net: 0 },
    ),
    [monthlyData],
  );

  const bestMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return monthlyData.reduce((best, m) => m.net > best.net ? m : best, monthlyData[0]!);
  }, [monthlyData]);

  const worstMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return monthlyData.reduce((worst, m) => m.net < worst.net ? m : worst, monthlyData[0]!);
  }, [monthlyData]);

  const avgMonthlyIncome = monthlyData.length > 0 ? totals.income / monthlyData.length : 0;
  const avgMonthlyExpenses = monthlyData.length > 0 ? totals.expenses / monthlyData.length : 0;

  return { monthlyData, totals, bestMonth, worstMonth, avgMonthlyIncome, avgMonthlyExpenses };
};
