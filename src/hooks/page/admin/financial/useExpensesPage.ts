/**
 * هوك منطق صفحة المصروفات
 */
import { useState, useMemo, useCallback } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { safeNumber } from '@/utils/format/safeNumber';
import { canModifyFiscalYear } from '@/utils/auth/permissions';
import { useExpensesByFiscalYear, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/data/financial/useExpenses';
import { useInvoicesByFiscalYear } from '@/hooks/data/invoices/useInvoices';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Expense } from '@/types/database';
import { EMPTY_FILTERS, type FilterState } from '@/components/filters/advancedFilters.types';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { defaultNotify } from '@/lib/notify';
import { useTableSort } from '@/hooks/ui/useTableSort';

export type SortField = 'amount' | 'date' | 'expense_type' | null;

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
  const [formData, setFormData] = useState(EMPTY_EXPENSE_FORM);

  const resetForm = useCallback(() => { setFormData(EMPTY_EXPENSE_FORM); setEditingExpense(null); }, []);

  const handleEdit = useCallback((item: Expense) => {
    setEditingExpense(item);
    setFormData({ expense_type: item.expense_type, amount: item.amount.toString(), date: item.date, property_id: item.property_id || '', description: item.description || '' });
    setIsOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expense_type || !formData.amount || !formData.date) { defaultNotify.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    const amount = parseFloat(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999) { defaultNotify.error('المبلغ يجب أن يكون رقماً موجباً ولا يتجاوز 999,999,999'); return; }
    const expenseData: Record<string, unknown> = {
      expense_type: formData.expense_type, amount, date: formData.date,
      property_id: formData.property_id || undefined, description: formData.description || undefined,
    };
    if (!editingExpense) {
      if (!fiscalYear?.id) { defaultNotify.error('يرجى اختيار سنة مالية محددة قبل إضافة مصروف'); return; }
      expenseData.fiscal_year_id = fiscalYear.id;
    }
    try {
      if (editingExpense) { await updateExpense.mutateAsync({ id: editingExpense.id, ...expenseData } as unknown as Parameters<typeof updateExpense.mutateAsync>[0]); } else { await createExpense.mutateAsync(expenseData as unknown as Parameters<typeof createExpense.mutateAsync>[0]); }
      setIsOpen(false);
      resetForm();
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      // #17 — البقاء في الصفحة الحالية ما لم تصبح فارغة
      const totalAfterDelete = expenses.length - 1;
      const maxPage = Math.ceil(totalAfterDelete / ITEMS_PER_PAGE);
      if (currentPage > maxPage) setCurrentPage(Math.max(1, maxPage));
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + safeNumber(item.amount), 0), [expenses]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(expenses.map((e) => e.expense_type));
    return Array.from(types).sort();
  }, [expenses]);

  // نسبة التوثيق: مصروف يُعتبر "موثقاً" إذا ارتبط بفاتورة واحدة على الأقل — قرار تجاري مقبول (#20)
  const { expenseInvoiceMap, documentedCount, documentationRate } = useMemo(() => {
    const map = new Map<string, number>();
    allInvoices.forEach((inv) => {
      if (inv.expense_id) {
        map.set(inv.expense_id, (map.get(inv.expense_id) || 0) + 1);
      }
    });
    const documented = expenses.filter((e) => map.has(e.id)).length;
    const rate = expenses.length > 0 ? Math.round((documented / expenses.length) * 100) : 0;
    return { expenseInvoiceMap: map, documentedCount: documented, documentationRate: rate };
  }, [allInvoices, expenses]);

  const filteredExpenses = useMemo(() => {
    let result = expenses.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.expense_type.toLowerCase().includes(q) && !(item.description || '').toLowerCase().includes(q) && !item.date.includes(q)) return false;
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

  /** هل السنة المالية محددة ويمكن الإضافة؟ — #15 */
  const canAdd = !!fiscalYear?.id && !isLocked;

  return {
    pdfWaqfInfo, fiscalYearId, fiscalYear, isClosed, role, isLocked, canAdd,
    expenses, isLoading, properties,
    createExpense, updateExpense,
    isOpen, setIsOpen, editingExpense,
    // فلاتر — تبقى مُطبّقة بعد إغلاق form (سلوك مقصود)
    searchQuery, setSearchQuery,
    filters, setFilters,
    sortField: sortField as SortField, sortDir, handleSort: handleSort as (field: SortField) => void,
    deleteTarget, setDeleteTarget,
    currentPage, setCurrentPage,
    expandedRow, setExpandedRow,
    ITEMS_PER_PAGE,
    formData, setFormData,
    resetForm, handleEdit, handleSubmit, handleConfirmDelete,
    totalExpenses, uniqueTypes,
    expenseInvoiceMap, documentedCount, documentationRate,
    filteredExpenses,
  };
}
