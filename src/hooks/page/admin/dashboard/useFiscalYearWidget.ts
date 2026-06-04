/**
 * useFiscalYearWidget — Page Hook لويدجت السنة المالية (S6-2).
 *
 * يعزل حسابات التقدم الزمني والمالي عن UI التزاماً بـ Page Hook Pattern.
 */
import { useMemo } from 'react';
import { useNowClock } from '@/lib/hooks/useNowClock';

interface FiscalYearInfo {
  label: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface UseFiscalYearWidgetParams {
  fiscalYear: FiscalYearInfo;
  totalIncome: number;
  contractualRevenue: number;
}

export interface FiscalYearWidgetCtx {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  timeProgress: number;
  rawFinancialProgress: number;
  financialProgress: number;
  exceededTarget: boolean;
}

const DAY_MS = 86_400_000;

export const useFiscalYearWidget = ({
  fiscalYear,
  totalIncome,
  contractualRevenue,
}: UseFiscalYearWidgetParams): FiscalYearWidgetCtx => {
  const now = useNowClock();

  const time = useMemo(() => {
    const start = new Date(fiscalYear.start_date).getTime();
    const end = new Date(fiscalYear.end_date).getTime();
    const total = Math.max(1, Math.ceil((end - start) / DAY_MS));
    const elapsed = Math.max(0, Math.ceil((now - start) / DAY_MS));
    const remaining = Math.max(0, Math.ceil((end - now) / DAY_MS));
    const progress = Math.min(100, Math.round((elapsed / total) * 100));
    return { totalDays: total, elapsedDays: elapsed, remainingDays: remaining, timeProgress: progress };
  }, [fiscalYear.start_date, fiscalYear.end_date, now]);

  const financial = useMemo(() => {
    const raw = contractualRevenue > 0 ? Math.round((totalIncome / contractualRevenue) * 100) : 0;
    return {
      rawFinancialProgress: raw,
      exceededTarget: raw > 100,
      financialProgress: Math.min(100, raw),
    };
  }, [totalIncome, contractualRevenue]);

  return { ...time, ...financial };
};
