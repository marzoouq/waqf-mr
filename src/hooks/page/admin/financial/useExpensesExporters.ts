/**
 * مُصدِّرات صفحة المصروفات — PDF/CSV (مفصول لتقليل حجم useExpensesPage).
 */
import { useCallback } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { uiNotify } from '@/lib/notify';
import type { Expense } from '@/types';
import type { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';

type PdfWaqfInfo = ReturnType<typeof usePdfWaqfInfo>;

export function useExpensesExporters(
  filteredExpenses: Expense[],
  totalExpenses: number,
  pdfWaqfInfo: PdfWaqfInfo,
) {
  const handleExportPdf = useCallback(async () => {
    const { generateExpensesPDF } = await import('@/utils/pdf');
    return generateExpensesPDF(filteredExpenses, totalExpenses, pdfWaqfInfo);
  }, [filteredExpenses, totalExpenses, pdfWaqfInfo]);

  const handleExportCsv = useCallback(() => {
    const csv = buildCsv(filteredExpenses.map(item => ({
      'النوع': item.expense_type,
      'المبلغ': safeNumber(item.amount),
      'التاريخ': item.date,
      'العقار': item.property?.property_number || '-',
      'الوصف': item.description || '-',
    })));
    downloadCsv(csv, 'مصروفات.csv');
    uiNotify.success('تم تصدير المصروفات بنجاح');
  }, [filteredExpenses]);

  return { handleExportPdf, handleExportCsv };
}
