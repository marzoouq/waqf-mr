/**
 * Hook لمنطق صفحة المقارنة التاريخية
 * يتضمن: اختيار السنوات، جلب البيانات، حساب صفوف المقارنة، بيانات الرسم البياني، تصدير PDF
 */
import { useState, useMemo, useCallback } from 'react';
import { useFiscalYears } from '@/hooks/data/financial/useFiscalYears';
import { useMultiYearSummary, type YearSummaryEntry } from '@/hooks/data/financial/useMultiYearSummary';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { defaultNotify } from '@/lib/notify';

export function useHistoricalComparison() {
  const { data: fiscalYears = [], isLoading: fyLoading } = useFiscalYears();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const waqfInfo = usePdfWaqfInfo();

  // ترتيب السنوات من الأقدم للأحدث للمقارنة
  const selectedYears = useMemo(
    () => fiscalYears
      .filter(fy => selectedIds.includes(fy.id))
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [fiscalYears, selectedIds],
  );

  // جلب بيانات كل السنوات المختارة في استدعاء RPC واحد
  const selectedYearIds = useMemo(() => selectedYears.map(fy => fy.id), [selectedYears]);
  const { data: multiYearData = [], isLoading: multiLoading } = useMultiYearSummary(selectedYearIds);

  // ترتيب البيانات بنفس ترتيب السنوات المختارة
  const yearData = useMemo(() => {
    return selectedYears.map(fy => {
      return multiYearData.find(d => d.yearId === fy.id) ?? null;
    });
  }, [selectedYears, multiYearData]);

  const isAnyLoading = multiLoading;

  // إضافة / إزالة سنة
  const toggleYear = useCallback((fyId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(fyId)) return prev.filter(id => id !== fyId);
      if (prev.length >= 4) {
        defaultNotify.warning('الحد الأقصى 4 سنوات للمقارنة');
        return prev;
      }
      return [...prev, fyId];
    });
  }, []);

  // بيانات الرسم البياني
  const chartData = useMemo(() => {
    if (selectedYears.length < 2) return [];
    const metrics = [
      { key: 'income', label: 'الدخل' },
      { key: 'expenses', label: 'المصروفات' },
      { key: 'net', label: 'الصافي' },
    ];
    return metrics.map(m => {
      const row: Record<string, string | number> = { metric: m.label };
      selectedYears.forEach((fy, i) => {
        const d = yearData[i];
        if (m.key === 'income') row[fy.label] = d?.totalIncome ?? 0;
        else if (m.key === 'expenses') row[fy.label] = d?.totalExpenses ?? 0;
        else row[fy.label] = d?.waqfRevenue ?? ((d?.totalIncome ?? 0) - (d?.totalExpenses ?? 0));
      });
      return row;
    });
  }, [selectedYears, yearData]);

  // صفوف جدول المقارنة
  const comparisonRows = useMemo(() => {
    if (selectedYears.length < 2) return [];
    return [
      { label: 'إجمالي الدخل', key: 'totalIncome', getValue: (d: YearSummaryEntry | null) => d?.totalIncome ?? 0 },
      { label: 'إجمالي المصروفات', key: 'totalExpenses', getValue: (d: YearSummaryEntry | null) => d?.totalExpenses ?? 0 },
      { label: 'صافي بعد المصروفات', key: 'netAfterExpenses', getValue: (d: YearSummaryEntry | null) => d?.netAfterExpenses ?? 0 },
      { label: 'الضريبة', key: 'vatAmount', getValue: (d: YearSummaryEntry | null) => d?.vatAmount ?? 0 },
      { label: 'الزكاة', key: 'zakatAmount', getValue: (d: YearSummaryEntry | null) => d?.zakatAmount ?? 0 },
      { label: 'حصة الناظر', key: 'adminShare', getValue: (d: YearSummaryEntry | null) => d?.adminShare ?? 0 },
      { label: 'حصة الواقف', key: 'waqifShare', getValue: (d: YearSummaryEntry | null) => d?.waqifShare ?? 0 },
      { label: 'ريع الوقف', key: 'waqfRevenue', getValue: (d: YearSummaryEntry | null) => d?.waqfRevenue ?? 0 },
      { label: 'المتاح للتوزيع', key: 'availableAmount', getValue: (d: YearSummaryEntry | null) => d?.availableAmount ?? 0 },
    ];
  }, [selectedYears]);

  // تصدير PDF
  const handleExportPdf = useCallback(async () => {
    if (selectedYears.length < 2) return;
    try {
      const { generateYearComparisonPDF } = await import('@/utils/pdf/reports/comparison');
      const d0 = yearData[0];
      const d1 = yearData[1];
      if (!d0 || !d1) {
        defaultNotify.error('بيانات السنوات غير مكتملة');
        return;
      }
      const y0 = selectedYears[0];
      const y1 = selectedYears[1];
      if (!y0 || !y1) return;
      await generateYearComparisonPDF({
        year1Label: selectedYears[0]!.label,
        year2Label: selectedYears[1]!.label,
        year1: { income: d0.totalIncome, expenses: d0.totalExpenses, net: d0.waqfRevenue ?? (d0.totalIncome - d0.totalExpenses) },
        year2: { income: d1.totalIncome, expenses: d1.totalExpenses, net: d1.waqfRevenue ?? (d1.totalIncome - d1.totalExpenses) },
        incomeChange: d0.totalIncome ? ((d1.totalIncome - d0.totalIncome) / d0.totalIncome) * 100 : 0,
        expenseChange: d0.totalExpenses ? ((d1.totalExpenses - d0.totalExpenses) / d0.totalExpenses) * 100 : 0,
        netChange: (() => {
          const n0 = d0.waqfRevenue ?? (d0.totalIncome - d0.totalExpenses);
          const n1 = d1.waqfRevenue ?? (d1.totalIncome - d1.totalExpenses);
          return n0 ? ((n1 - n0) / Math.abs(n0)) * 100 : 0;
        })(),
        expensesByType1: Object.entries(d0.expensesByType).map(([name, value]) => ({ name, value })),
        expensesByType2: Object.entries(d1.expensesByType).map(([name, value]) => ({ name, value })),
        monthlyData: [],
      }, waqfInfo ?? undefined);
      defaultNotify.success('تم تصدير PDF بنجاح');
    } catch {
      defaultNotify.error('فشل تصدير PDF');
    }
  }, [selectedYears, yearData, waqfInfo]);

  return {
    fiscalYears,
    fyLoading,
    selectedIds,
    selectedYears,
    yearData,
    isAnyLoading,
    toggleYear,
    chartData,
    comparisonRows,
    handleExportPdf,
  };
}
