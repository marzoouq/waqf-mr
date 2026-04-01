/**
 * هوك حسابات مقارنة السنوات المالية
 */
import { useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export function buildMonthlyMap(items: Array<{ date: string; amount: number }>) {
  const map = new Map<number, number>();
  for (const item of items) {
    const d = new Date(item.date);
    map.set(d.getMonth(), (map.get(d.getMonth()) || 0) + safeNumber(item.amount));
  }
  return map;
}

interface Summary {
  income: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
  totalIncome: number;
  totalExpenses: number;
  expensesByType: Record<string, number>;
}

export const useYearComparisonData = (
  summary1: Summary,
  summary2: Summary,
  year1Label: string,
  year2Label: string,
) => {
  const comparisonData = useMemo(() => {
    const incomeMap1 = buildMonthlyMap(summary1.income);
    const expenseMap1 = buildMonthlyMap(summary1.expenses);
    const incomeMap2 = buildMonthlyMap(summary2.income);
    const expenseMap2 = buildMonthlyMap(summary2.expenses);

    return MONTH_NAMES.map((name, idx) => ({
      month: name,
      [`دخل ${year1Label}`]: incomeMap1.get(idx) || 0,
      [`دخل ${year2Label}`]: incomeMap2.get(idx) || 0,
      [`مصروفات ${year1Label}`]: expenseMap1.get(idx) || 0,
      [`مصروفات ${year2Label}`]: expenseMap2.get(idx) || 0,
      net1: (incomeMap1.get(idx) || 0) - (expenseMap1.get(idx) || 0),
      net2: (incomeMap2.get(idx) || 0) - (expenseMap2.get(idx) || 0),
    })).filter(d => {
      const keys = Object.keys(d).filter(k => k !== 'month');
      return keys.some(k => (d as Record<string, unknown>)[k] !== 0);
    });
  }, [summary1.income, summary1.expenses, summary2.income, summary2.expenses, year1Label, year2Label]);

  const expensesByType1 = useMemo(() =>
    Object.entries(summary1.expensesByType).map(([name, value]) => ({ name, value })),
    [summary1.expensesByType]);

  const expensesByType2 = useMemo(() =>
    Object.entries(summary2.expensesByType).map(([name, value]) => ({ name, value })),
    [summary2.expensesByType]);

  const yearTotals = useMemo(() => ({
    year1: { income: summary1.totalIncome, expenses: summary1.totalExpenses, net: summary1.totalIncome - summary1.totalExpenses },
    year2: { income: summary2.totalIncome, expenses: summary2.totalExpenses, net: summary2.totalIncome - summary2.totalExpenses },
  }), [summary1.totalIncome, summary1.totalExpenses, summary2.totalIncome, summary2.totalExpenses]);

  const incomeChange = yearTotals.year1.income > 0
    ? ((yearTotals.year2.income - yearTotals.year1.income) / yearTotals.year1.income * 100) : 0;
  const expenseChange = yearTotals.year1.expenses > 0
    ? ((yearTotals.year2.expenses - yearTotals.year1.expenses) / yearTotals.year1.expenses * 100) : 0;
  const netChange = yearTotals.year1.net !== 0
    ? ((yearTotals.year2.net - yearTotals.year1.net) / Math.abs(yearTotals.year1.net) * 100) : 0;

  return { comparisonData, expensesByType1, expensesByType2, yearTotals, incomeChange, expenseChange, netChange };
};
