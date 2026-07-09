/**
 * هوك صفحة إفصاح المصروفات للمستفيد/الواقف — قراءة فقط.
 *
 * يعرض ملخّصاً إفصاحياً (إجماليات + مخطط + نسبة توثيق) وسجلاً تفصيلياً
 * لكل مصروف مع فواتيره المرفقة (ZATCA) القابلة للفتح داخل InvoiceViewer.
 * لا أزرار تعديل/حذف. جدول الفواتير المستقل ملغى (فواتير الإيجار
 * فقط في صفحة "الفواتير").
 */
import { useCallback, useMemo, useState } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/expenses/useExpenses';
import { useInvoicesByFiscalYear } from '@/hooks/data/invoices/useInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { uiNotify } from '@/lib/notify';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { buildCsv, downloadCsv } from '@/utils/export/csv';
import { computeDocumentationStats } from '@/utils/financial/contracts/documentationRate';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

export function useExpensesViewPage() {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, isClosed } = useFiscalYear();

  useDashboardRealtime(
    'expenses-view-realtime',
    ['expenses', 'invoices'],
    true,
  );

  const { data: expenses = [], isLoading } = useExpensesByFiscalYear(fiscalYearId);
  const { data: allInvoices = [], isLoading: isLoadingInvoices } = useInvoicesByFiscalYear(fiscalYearId);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + safeNumber(item.amount), 0),
    [expenses],
  );

  const { expenseInvoiceMap, documentedCount, documentationRate } = useMemo(
    () => computeDocumentationStats(expenses, allInvoices),
    [expenses, allInvoices],
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

  const paginatedExpenses = useMemo(
    () => expenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [expenses, currentPage, ITEMS_PER_PAGE],
  );

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
      'عدد الفواتير المرفقة': expenseInvoiceMap.get(item.id) ?? 0,
    })));
    downloadCsv(csv, 'مصروفات.csv');
    uiNotify.success('تم تصدير المصروفات بنجاح');
  }, [expenses, expenseInvoiceMap]);

  return {
    pdfWaqfInfo, fiscalYearId, isClosed,
    expenses, isLoading: isLoading || isLoadingInvoices,
    totalExpenses,
    expenseInvoiceMap, documentedCount, documentationRate,
    currentPage, setCurrentPage, ITEMS_PER_PAGE,
    expandedRow, setExpandedRow,
    paginatedExpenses,
    handleExportPdf, handleExportCsv,
  };
}
