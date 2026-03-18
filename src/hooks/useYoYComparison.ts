/**
 * هوك لحساب مقارنة YoY (سنة بسنة) للبيانات المالية.
 * يُرجع بيانات السنة السابقة لمقارنتها مع الحالية.
 */
import { useMemo } from 'react';
import { useFiscalYears } from '@/hooks/useFiscalYears';
import { useRawFinancialData } from '@/hooks/useRawFinancialData';
import { computeTotals } from '@/utils/accountsCalculations';

interface YoYResult {
  prevTotalIncome: number;
  prevTotalExpenses: number;
  prevNetAfterExpenses: number;
  hasPrevYear: boolean;
}

export const useYoYComparison = (currentFiscalYearId?: string): YoYResult => {
  const { data: allFiscalYears = [] } = useFiscalYears();

  // إيجاد السنة السابقة
  const prevFiscalYear = useMemo(() => {
    if (!currentFiscalYearId || currentFiscalYearId === 'all') return null;
    const sorted = [...allFiscalYears].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const currentIdx = sorted.findIndex(fy => fy.id === currentFiscalYearId);
    if (currentIdx > 0) return sorted[currentIdx - 1];
    return null;
  }, [allFiscalYears, currentFiscalYearId]);

  const { income: prevIncome, expenses: prevExpenses } = useRawFinancialData(
    prevFiscalYear?.id || '__skip__',
    prevFiscalYear?.label,
  );

  return useMemo(() => {
    if (!prevFiscalYear) {
      return { prevTotalIncome: 0, prevTotalExpenses: 0, prevNetAfterExpenses: 0, hasPrevYear: false };
    }
    const { totalIncome, totalExpenses } = computeTotals(prevIncome, prevExpenses);
    return {
      prevTotalIncome: totalIncome,
      prevTotalExpenses: totalExpenses,
      prevNetAfterExpenses: totalIncome - totalExpenses,
      hasPrevYear: true,
    };
  }, [prevFiscalYear, prevIncome, prevExpenses]);
};

/** حساب نسبة التغيير بين قيمتين */
export const calcChangePercent = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
};
