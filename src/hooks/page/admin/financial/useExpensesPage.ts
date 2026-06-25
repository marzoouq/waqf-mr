/**
 * هوك منطق صفحة المصروفات — حالة UI + استعلامات.
 * Mutations مستخرجة في useExpensesMutations.
 */
import { useState, useMemo, useCallback } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { getExpenseFieldErrors, type ExpenseFieldErrors, type ExpenseFormInput } from '@/utils/financial/expenses/expenseFormValidation';
import { safeNumber } from '@/utils/format/safeNumber';
import { canModifyFiscalYear } from '@/utils/auth/permissions';
import type { SortFieldOf } from '@/types/sorting';
import { useExpensesByFiscalYear, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/data/financial/expenses/useExpenses';
import { useInvoicesByFiscalYear } from '@/hooks/data/invoices/useInvoices';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { Expense } from '@/types';
import { EMPTY_FILTERS, type FilterState } from '@/types/ui';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { useTableSort } from '@/hooks/ui/useTableSort';
import { computeDocumentationStats } from '@/utils/financial/contracts/documentationRate';
import { filterAndSortExpenses } from '@/utils/financial/expenses/expensesCompute';
import { useExpensesExporters } from './useExpensesExporters';
import { useExpensesMutations } from './useExpensesMutations';

export type SortField = SortFieldOf<'amount' | 'date' | 'expense_type'>;

const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;
const EMPTY_EXPENSE_FORM = { expense_type: '', amount: '', date: '', property_id: '', description: '' };

export function useExpensesPage() {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const { role } = useAuth();
  const isLocked = !canModifyFiscalYear(role, isClosed);

  const { data: expenses = [], isLoading } = useExpensesByFiscalYear(fiscalYearId);
  const { data: allInvoices = [] } = useInvoicesByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [isOpen, setIsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const { sortField, sortDir, handleSort } = useTableSort<'amount' | 'date' | 'expense_type'>();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [formData, setFormDataRaw] = useState(EMPTY_EXPENSE_FORM);
  const [errors, setErrors] = useState<ExpenseFieldErrors>({});
  const [postCreateVoucherFor, setPostCreateVoucherFor] = useState<{ id: string; amount: number; description: string } | null>(null);
  const clearPostCreateVoucher = useCallback(() => setPostCreateVoucherFor(null), []);

  const setFormData = useCallback((data: typeof EMPTY_EXPENSE_FORM) => {
    setFormDataRaw(data);
    setErrors((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  const onFieldBlur = useCallback((field: keyof ExpenseFormInput) => {
    setFormDataRaw((current) => {
      const fieldErrors = getExpenseFieldErrors(current);
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
      return current;
    });
  }, []);

  const resetForm = useCallback(() => { setFormDataRaw(EMPTY_EXPENSE_FORM); setEditingExpense(null); setErrors({}); }, []);

  const handleEdit = useCallback((item: Expense) => {
    setEditingExpense(item);
    setFormDataRaw({ expense_type: item.expense_type, amount: item.amount.toString(), date: item.date, property_id: item.property_id || '', description: item.description || '' });
    setErrors({});
    setIsOpen(true);
  }, []);

  const { handleSubmit, handleConfirmDelete } = useExpensesMutations({
    formData, editingExpense, fiscalYear,
    expensesCount: expenses.length, currentPage, itemsPerPage: ITEMS_PER_PAGE, deleteTarget,
    createExpense: createExpense as Parameters<typeof useExpensesMutations>[0]['createExpense'],
    updateExpense: updateExpense as Parameters<typeof useExpensesMutations>[0]['updateExpense'],
    deleteExpense: deleteExpense as Parameters<typeof useExpensesMutations>[0]['deleteExpense'],
    setErrors, setIsOpen, resetForm, setDeleteTarget, setCurrentPage, setPostCreateVoucherFor,
  });

  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + safeNumber(item.amount), 0), [expenses]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(expenses.map((e) => e.expense_type));
    return Array.from(types).sort();
  }, [expenses]);

  const { expenseInvoiceMap, documentedCount, documentationRate } = useMemo(
    () => computeDocumentationStats(expenses, allInvoices),
    [allInvoices, expenses],
  );

  const filteredExpenses = useMemo(
    () => filterAndSortExpenses(expenses, searchQuery, filters, sortField ?? null, sortDir),
    [expenses, searchQuery, filters, sortField, sortDir],
  );

  const paginatedExpenses = useMemo(
    () => filteredExpenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredExpenses, currentPage]
  );

  /** هل السنة المالية محددة ويمكن الإضافة؟ */
  const canAdd = !!fiscalYear?.id && !isLocked;

  const { handleExportPdf, handleExportCsv } = useExpensesExporters(filteredExpenses, totalExpenses, pdfWaqfInfo);

  return {
    pdfWaqfInfo, fiscalYearId, fiscalYear, isClosed, role, isLocked, canAdd,
    expenses, isLoading, properties,
    createExpense, updateExpense,
    isOpen, setIsOpen, editingExpense,
    searchQuery, setSearchQuery,
    filters, setFilters,
    sortField: sortField as SortField, sortDir, handleSort: handleSort as (field: SortField) => void,
    deleteTarget, setDeleteTarget,
    currentPage, setCurrentPage,
    expandedRow, setExpandedRow,
    ITEMS_PER_PAGE,
    formData, setFormData, errors, onFieldBlur,
    resetForm, handleEdit, handleSubmit, handleConfirmDelete,
    totalExpenses, uniqueTypes,
    expenseInvoiceMap, documentedCount, documentationRate,
    filteredExpenses, paginatedExpenses,
    handleExportPdf, handleExportCsv,
    postCreateVoucherFor, clearPostCreateVoucher,
  };
}
