/**
 * هوك صفحة إفصاح المصروفات للمستفيد/الواقف — قراءة فقط، ملخّص إفصاحي.
 *
 * لا يعرض جدولاً تشغيلياً صف-بصف (ذلك محصور بلوحة الناظر) بل بطاقات
 * إجماليات ومخطط توزيع نسبي + تصدير PDF/CSV للإجماليات. ذلك يمنع
 * ازدواج البيانات مع صفحة "الفواتير" ويلائم دور المستفيد.
 */
import { useCallback } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/expenses/useExpenses';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { uiNotify } from '@/lib/notify';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { buildCsv, downloadCsv } from '@/utils/export/csv';

export function useExpensesViewPage() {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, isClosed } = useFiscalYear();

  useDashboardRealtime(
    'expenses-view-realtime',
    ['expenses'],
    true,
  );

  const { data: expenses = [], isLoading } = useExpensesByFiscalYear(fiscalYearId);

  const totalExpenses = expenses.reduce((sum, item) => sum + safeNumber(item.amount), 0);

  const handleExportPdf = useCallback(async () => {
    const { generateExpensesPDF } = await import('@/utils/pdf');
    return generateExpensesPDF(expenses, totalExpenses, pdfWaqfInfo);
  }, [expenses, totalExpenses, pdfWaqfInfo]);

  const handleExportCsv = useCallback(() => {
    const csv = buildCsv(expenses.map((item) => ({
      'النوع': item.expense_type,
      'المبلغ': safeNumber(item.amount),
      'التاريخ': item.date,
      'العقار': item.property?.property_number || '-',
      'الوصف': item.description || '-',
    })));
    downloadCsv(csv, 'مصروفات.csv');
    uiNotify.success('تم تصدير المصروفات بنجاح');
  }, [expenses]);

  return {
    pdfWaqfInfo, fiscalYearId, isClosed,
    expenses, isLoading,
    totalExpenses,
    handleExportPdf, handleExportCsv,
  };
}
