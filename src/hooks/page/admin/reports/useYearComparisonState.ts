/**
 * useYearComparisonState — حالة محلية لمقارنة سنتين ماليتين
 *
 * يستخرج state + computations من YearOverYearComparison
 * ليبقى المكوّن UI خالصاً (logic-less).
 *
 * المسؤوليات:
 *  - حالة year1Id/year2Id + initialization
 *  - استدعاء useYearComparisonData و useFiscalYearSummaries
 *  - حساب comparisonData / yearTotals / تغيرات النسب
 *  - تجهيز handler التصدير PDF
 */
import { useState, useMemo, useEffect } from 'react';
import type { FiscalYear } from '@/hooks/data/financial/useFiscalYears';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { useYearComparisonData } from '@/hooks/data/financial/useYearComparisonData';
import { useFiscalYearSummaries } from '@/hooks/data/financial/useFiscalYearSummary';
import { MONTH_NAMES } from '@/constants/calendar';

interface UseYearComparisonStateArgs {
  fiscalYears: FiscalYear[];
  currentFiscalYearId: string;
}

export function useYearComparisonState({ fiscalYears, currentFiscalYearId }: UseYearComparisonStateArgs) {
  const waqfInfo = usePdfWaqfInfo();
  const [year1Id, setYear1Id] = useState(currentFiscalYearId);
  const [year2Id, setYear2Id] = useState('');

  useEffect(() => {
    if (currentFiscalYearId && !year1Id) setYear1Id(currentFiscalYearId);
    if (fiscalYears.length >= 2 && !year2Id) {
      const other = fiscalYears.find(fy => fy.id !== currentFiscalYearId);
      if (other) setYear2Id(other.id);
    }
  }, [currentFiscalYearId, fiscalYears, year1Id, year2Id]);

  const year1Label = fiscalYears.find(fy => fy.id === year1Id)?.label || '';
  const year2Label = fiscalYears.find(fy => fy.id === year2Id)?.label || '';

  const { year1Monthly, year2Monthly, totals, expensesByType } = useYearComparisonData(year1Id, year2Id);

  const { data: viewSummaries, isLoading: summariesLoading } = useFiscalYearSummaries(
    year1Id && year2Id && year1Id !== year2Id ? [year1Id, year2Id] : []
  );
  const viewYear1 = viewSummaries?.find(s => s.fiscalYearId === year1Id);
  const viewYear2 = viewSummaries?.find(s => s.fiscalYearId === year2Id);

  const comparisonData = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => ({
      month: name,
      [`دخل ${year1Label}`]: year1Monthly.income.get(idx) || 0,
      [`دخل ${year2Label}`]: year2Monthly.income.get(idx) || 0,
      [`مصروفات ${year1Label}`]: year1Monthly.expenses.get(idx) || 0,
      [`مصروفات ${year2Label}`]: year2Monthly.expenses.get(idx) || 0,
      net1: (year1Monthly.income.get(idx) || 0) - (year1Monthly.expenses.get(idx) || 0),
      net2: (year2Monthly.income.get(idx) || 0) - (year2Monthly.expenses.get(idx) || 0),
    })).filter(d => {
      const keys = Object.keys(d).filter(k => k !== 'month');
      return keys.some(k => (d as Record<string, unknown>)[k] !== 0);
    });
  }, [year1Monthly, year2Monthly, year1Label, year2Label]);

  const expensesByType1 = useMemo(() =>
    Object.entries(expensesByType.year1).map(([name, value]) => ({ name, value })),
    [expensesByType.year1]);

  const expensesByType2 = useMemo(() =>
    Object.entries(expensesByType.year2).map(([name, value]) => ({ name, value })),
    [expensesByType.year2]);

  const yearTotals = useMemo(() => ({
    year1: { income: totals.year1.totalIncome, expenses: totals.year1.totalExpenses, net: totals.year1.totalIncome - totals.year1.totalExpenses },
    year2: { income: totals.year2.totalIncome, expenses: totals.year2.totalExpenses, net: totals.year2.totalIncome - totals.year2.totalExpenses },
  }), [totals]);

  const incomeChange = yearTotals.year1.income > 0
    ? ((yearTotals.year2.income - yearTotals.year1.income) / yearTotals.year1.income * 100) : 0;
  const expenseChange = yearTotals.year1.expenses > 0
    ? ((yearTotals.year2.expenses - yearTotals.year1.expenses) / yearTotals.year1.expenses * 100) : 0;
  const netChange = yearTotals.year1.net !== 0
    ? ((yearTotals.year2.net - yearTotals.year1.net) / Math.abs(yearTotals.year1.net) * 100) : 0;

  const handleExportPDF = async () => {
    const monthlyPdfData = MONTH_NAMES.map((name, idx) => ({
      month: name,
      income1: year1Monthly.income.get(idx) || 0, expenses1: year1Monthly.expenses.get(idx) || 0,
      net1: (year1Monthly.income.get(idx) || 0) - (year1Monthly.expenses.get(idx) || 0),
      income2: year2Monthly.income.get(idx) || 0, expenses2: year2Monthly.expenses.get(idx) || 0,
      net2: (year2Monthly.income.get(idx) || 0) - (year2Monthly.expenses.get(idx) || 0),
    })).filter(m => m.income1 || m.expenses1 || m.income2 || m.expenses2);

    const { generateYearComparisonPDF } = await import('@/utils/pdf');
    await generateYearComparisonPDF({
      year1Label, year2Label,
      year1: yearTotals.year1, year2: yearTotals.year2,
      incomeChange, expenseChange, netChange,
      expensesByType1, expensesByType2,
      monthlyData: monthlyPdfData,
    }, waqfInfo);
  };

  return {
    year1Id, year2Id, setYear1Id, setYear2Id,
    year1Label, year2Label,
    comparisonData, expensesByType1, expensesByType2,
    yearTotals, incomeChange, expenseChange, netChange,
    viewYear1, viewYear2, summariesLoading,
    handleExportPDF,
  };
}
