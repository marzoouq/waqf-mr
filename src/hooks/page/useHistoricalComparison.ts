/**
 * Hook لمنطق صفحة المقارنة التاريخية
 * يتضمن: اختيار السنوات، جلب البيانات، حساب صفوف المقارنة، بيانات الرسم البياني، تصدير PDF
 */
import { useState, useMemo, useCallback } from 'react';
import { useFiscalYears } from '@/hooks/financial/useFiscalYears';
import { useFinancialSummary } from '@/hooks/financial/useFinancialSummary';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { toast } from 'sonner';

/** Hook لجلب بيانات سنة واحدة */
function useYearData(fiscalYearId?: string, fiscalYearLabel?: string, status?: string) {
  return useFinancialSummary(fiscalYearId, fiscalYearLabel, {
    forceClosedMode: status === 'closed',
    fiscalYearStatus: status,
  });
}

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

  // جلب بيانات كل سنة مختارة (حتى 4)
  const y0 = useYearData(selectedYears[0]?.id, selectedYears[0]?.label, selectedYears[0]?.status);
  const y1 = useYearData(selectedYears[1]?.id, selectedYears[1]?.label, selectedYears[1]?.status);
  const y2 = useYearData(selectedYears[2]?.id, selectedYears[2]?.label, selectedYears[2]?.status);
  const y3 = useYearData(selectedYears[3]?.id, selectedYears[3]?.label, selectedYears[3]?.status);
  const yearData = [y0, y1, y2, y3].slice(0, selectedYears.length);

  const isAnyLoading = yearData.some(y => y.isLoading);

  // إضافة / إزالة سنة
  const toggleYear = useCallback((fyId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(fyId)) return prev.filter(id => id !== fyId);
      if (prev.length >= 4) {
        toast.warning('الحد الأقصى 4 سنوات للمقارنة');
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
      { label: 'إجمالي الدخل', key: 'totalIncome', getValue: (d: typeof y0) => d.totalIncome },
      { label: 'إجمالي المصروفات', key: 'totalExpenses', getValue: (d: typeof y0) => d.totalExpenses },
      { label: 'صافي بعد المصروفات', key: 'netAfterExpenses', getValue: (d: typeof y0) => d.netAfterExpenses ?? 0 },
      { label: 'الضريبة', key: 'vatAmount', getValue: (d: typeof y0) => d.vatAmount },
      { label: 'الزكاة', key: 'zakatAmount', getValue: (d: typeof y0) => d.zakatAmount },
      { label: 'حصة الناظر', key: 'adminShare', getValue: (d: typeof y0) => d.adminShare ?? 0 },
      { label: 'حصة الواقف', key: 'waqifShare', getValue: (d: typeof y0) => d.waqifShare ?? 0 },
      { label: 'ريع الوقف', key: 'waqfRevenue', getValue: (d: typeof y0) => d.waqfRevenue ?? 0 },
      { label: 'المتاح للتوزيع', key: 'availableAmount', getValue: (d: typeof y0) => d.availableAmount ?? 0 },
    ];
  }, [selectedYears.length]);

  // تصدير PDF
  const handleExportPdf = useCallback(async () => {
    if (selectedYears.length < 2) return;
    try {
      const { generateYearComparisonPDF } = await import('@/utils/pdf/reports/comparison');
      const d0 = yearData[0]!;
      const d1 = yearData[1]!;
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
      toast.success('تم تصدير PDF بنجاح');
    } catch {
      toast.error('فشل تصدير PDF');
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
