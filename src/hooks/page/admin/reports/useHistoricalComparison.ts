/**
 * Hook لمنطق صفحة المقارنة التاريخية
 * يتضمن: اختيار السنوات، جلب البيانات، حساب صفوف المقارنة، بيانات الرسم البياني، تصدير PDF متعدد السنوات
 */
import { useState, useMemo, useCallback } from 'react';
import { useFiscalYears } from '@/hooks/data/financial/fiscalYears/useFiscalYears';
import { useMultiYearSummary, type YearSummaryEntry } from '@/hooks/data/financial/fiscalYears/useMultiYearSummary';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { uiNotify } from '@/lib/notify';

// ثلاث مراحل صافية منفصلة — يُعرض كل منها في عمود/خط مستقل
const netAfterExpensesOf = (d: YearSummaryEntry | null | undefined) =>
  d?.netAfterExpenses ?? ((d?.totalIncome ?? 0) - (d?.totalExpenses ?? 0));
const netAfterZakatOf = (d: YearSummaryEntry | null | undefined) =>
  d?.netAfterZakat ?? ((d?.netAfterVat ?? 0) - (d?.zakatAmount ?? 0));
const waqfRevenueOf = (d: YearSummaryEntry | null | undefined) => d?.waqfRevenue ?? 0;

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

  const selectedYearIds = useMemo(() => selectedYears.map(fy => fy.id), [selectedYears]);
  const { data: multiYearData = [], isLoading: multiLoading, isError: multiError, error: multiErrorObj } = useMultiYearSummary(selectedYearIds);

  const yearData = useMemo(() => {
    return selectedYears.map(fy => multiYearData.find(d => d.yearId === fy.id) ?? null);
  }, [selectedYears, multiYearData]);

  const isAnyLoading = multiLoading;

  const toggleYear = useCallback((fyId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(fyId)) return prev.filter(id => id !== fyId);
      if (prev.length >= 4) {
        uiNotify.warning('الحد الأقصى 4 سنوات للمقارنة');
        return prev;
      }
      return [...prev, fyId];
    });
  }, []);

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
        else row[fy.label] = netOf(d);
      });
      return row;
    });
  }, [selectedYears, yearData]);

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

  // تصدير PDF — يدعم 2-4 سنوات
  const handleExportPdf = useCallback(async () => {
    if (selectedYears.length < 2) return;
    try {
      const { generateMultiYearComparisonPDF } = await import('@/utils/pdf/reports/multiYearComparison');
      const years = selectedYears.map((fy, i) => {
        const d = yearData[i];
        return {
          label: fy.label,
          income: d?.totalIncome ?? 0,
          expenses: d?.totalExpenses ?? 0,
          net: netOf(d),
          vatAmount: d?.vatAmount ?? 0,
          zakatAmount: d?.zakatAmount ?? 0,
          adminShare: d?.adminShare ?? 0,
          waqifShare: d?.waqifShare ?? 0,
          distributionsAmount: d?.distributionsAmount ?? 0,
          expensesByType: Object.entries(d?.expensesByType ?? {}).map(([name, value]) => ({ name, value })),
        };
      });
      await generateMultiYearComparisonPDF({ years }, waqfInfo ?? undefined);
      uiNotify.success('تم تصدير PDF بنجاح');
    } catch {
      uiNotify.error('فشل تصدير PDF');
    }
  }, [selectedYears, yearData, waqfInfo]);

  return {
    fiscalYears,
    fyLoading,
    selectedIds,
    selectedYears,
    yearData,
    isAnyLoading,
    isError: multiError,
    error: multiErrorObj,
    toggleYear,
    chartData,
    comparisonRows,
    handleExportPdf,
  };
}
