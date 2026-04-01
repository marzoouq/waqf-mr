/**
 * هوك حسابات التدفق النقدي الشهري
 */
import { useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export interface CashFlowMonth {
  month: string;
  monthNum: number;
  income: number;
  expenses: number;
  net: number;
  cumulative: number;
}

export interface CashFlowTotals {
  totalIncome: number;
  totalExpenses: number;
  totalNet: number;
  positiveMonths: number;
  negativeMonths: number;
}

interface Params {
  income: Array<{ date: string; amount: number }>;
  expenses: Array<{ date: string; amount: number }>;
  fiscalYear?: { label: string; start_date: string; end_date: string } | null;
}

export const useCashFlowData = ({ income, expenses, fiscalYear }: Params) => {
  const monthlyData = useMemo(() => {
    const months: CashFlowMonth[] = [];
    const startDate = fiscalYear ? new Date(fiscalYear.start_date) : new Date(new Date().getFullYear(), 0, 1);

    let cumulative = 0;
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const monthIncome = income
        .filter(item => { const d = new Date(item.date); return d.getFullYear() === year && d.getMonth() === month; })
        .reduce((sum, item) => sum + safeNumber(item.amount), 0);

      const monthExpenses = expenses
        .filter(item => { const d = new Date(item.date); return d.getFullYear() === year && d.getMonth() === month; })
        .reduce((sum, item) => sum + safeNumber(item.amount), 0);

      const net = monthIncome - monthExpenses;
      cumulative += net;

      months.push({ month: MONTH_NAMES[month]!, monthNum: month, income: monthIncome, expenses: monthExpenses, net, cumulative });
    }
    return months;
  }, [income, expenses, fiscalYear]);

  const totals = useMemo<CashFlowTotals>(() => {
    const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
    return {
      totalIncome,
      totalExpenses,
      totalNet: totalIncome - totalExpenses,
      positiveMonths: monthlyData.filter(m => m.net > 0).length,
      negativeMonths: monthlyData.filter(m => m.net < 0).length,
    };
  }, [monthlyData]);

  return { monthlyData, totals };
};
