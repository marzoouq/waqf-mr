/**
 * هوك صفحة عرض المصروفات للمستفيد/الواقف — قراءة فقط.
 *
 * يطابق `useExpensesPage` (لوحة الناظر) في مصدر البيانات والفلاتر والملخصات
 * والتصدير، باستثناء دوال الإنشاء/التعديل/الحذف وإدارة الميزانية.
 *
 * مرجع الذاكرة: mem://business-logic/finance/beneficiary-expenses-view-parity
 */
import { useState, useMemo, useCallback } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { safeNumber } from '@/utils/format/safeNumber';
import type { SortFieldOf } from '@/types/sorting';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/expenses/useExpenses';
import { useInvoicesByFiscalYear } from '@/hooks/data/invoices/useInvoices';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { EMPTY_FILTERS, type FilterState } from '@/types/ui';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { uiNotify } from '@/lib/notify';
import { useTableSort } from '@/hooks/ui/useTableSort';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { computeDocumentationStats } from '@/utils/financial/documentationRate';
import { buildCsv, downloadCsv } from '@/utils/export/csv';

export type ExpensesViewSortField = SortFieldOf<'amount' | 'date' | 'expense_type'>;

const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

export function useExpensesViewPage() {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, isClosed } = useFiscalYear();

  // N2: Realtime — انعكاس فوري لمصاريف الناظر الجديدة
  useDashboardRealtime(
    'expenses-view-realtime',
    ['expenses', 'invoices', 'fiscal_years'],
    true,
  );

  const { data: expenses = [], isLoading } = useExpensesByFiscalYear(fiscalYearId);
  const { data: allInvoices = [] } = useInvoicesByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  // N6: ترتيب افتراضي بالأحدث تاريخاً
  const { sortField, sortDir, handleSort } = useTableSort<'amount' | 'date' | 'expense_type'>('date', 'desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + safeNumber(item.amount), 0),
    [expenses],
  );

  const uniqueTypes = useMemo(() => {
    const types = new Set(expenses.map((e) => e.expense_type));
    return Array.from(types).sort();
  }, [expenses]);

  const { expenseInvoiceMap, documentedCount, documentationRate } = useMemo(
    () => computeDocumentationStats(expenses, allInvoices),
    [allInvoices, expenses],
  );

  const filteredExpenses = useMemo(() => {
    let result = expenses.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !item.expense_type.toLowerCase().includes(q)
          && !(item.description || '').toLowerCase().includes(q)
          && !item.date.includes(q)
        ) return false;
      }
      if (filters.category && item.expense_type !== filters.category) return false;
      if (filters.propertyId && item.property_id !== filters.propertyId) return false;
      if (filters.dateFrom && item.date < filters.dateFrom) return false;
      if (filters.dateTo && item.date > filters.dateTo) return false;
      return true;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'amount') cmp = safeNumber(a.amount) - safeNumber(b.amount);
        else if (sortField === 'date') cmp = a.date.localeCompare(b.date);
        else if (sortField === 'expense_type') cmp = a.expense_type.localeCompare(b.expense_type, 'ar');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [expenses, searchQuery, filters, sortField, sortDir]);

  const paginatedExpenses = useMemo(
    () => filteredExpenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredExpenses, currentPage],
  );

  const handleExportPdf = useCallback(async () => {
    const { generateExpensesPDF } = await import('@/utils/pdf');
    return generateExpensesPDF(filteredExpenses, totalExpenses, pdfWaqfInfo);
  }, [filteredExpenses, totalExpenses, pdfWaqfInfo]);

  const handleExportCsv = useCallback(() => {
    const csv = buildCsv(filteredExpenses.map((item) => ({
      'النوع': item.expense_type,
      'المبلغ': safeNumber(item.amount),
      'التاريخ': item.date,
      'العقار': item.property?.property_number || '-',
      'الوصف': item.description || '-',
    })));
    downloadCsv(csv, 'مصروفات.csv');
    uiNotify.success('تم تصدير المصروفات بنجاح');
  }, [filteredExpenses]);

  // قراءة فقط — التحرير/الحذف معطّلان دائماً في جداول العرض المشتركة
  const isLocked = true;

  return {
    pdfWaqfInfo, fiscalYearId, isClosed, isLocked,
    expenses, isLoading, properties,
    searchQuery, setSearchQuery,
    filters, setFilters,
    sortField: sortField as ExpensesViewSortField,
    sortDir,
    handleSort: handleSort as (field: ExpensesViewSortField) => void,
    currentPage, setCurrentPage,
    expandedRow, setExpandedRow,
    ITEMS_PER_PAGE,
    totalExpenses, uniqueTypes,
    expenseInvoiceMap, documentedCount, documentationRate,
    filteredExpenses, paginatedExpenses,
    handleExportPdf, handleExportCsv,
  };
}
