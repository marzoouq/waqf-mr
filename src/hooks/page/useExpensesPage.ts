/**
 * هوك منطق صفحة المصروفات
 */
import { useState, useMemo, useCallback } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { useExpensesByFiscalYear, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/data/useExpenses';
import { useInvoicesByFiscalYear } from '@/hooks/data/useInvoices';
import { useProperties } from '@/hooks/data/useProperties';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Expense } from '@/types/database';
import { EMPTY_FILTERS, type FilterState } from '@/components/filters/advancedFilters.types';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { toast } from 'sonner';

type SortField = 'amount' | 'date' | 'expense_type' | null;
type SortDir = 'asc' | 'desc';

export function useExpensesPage() {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const { role } = useAuth();
  const isLocked = isClosed && role !== 'admin' && role !== 'accountant';

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
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;
  const [formData, setFormData] = useState({ expense_type: '', amount: '', date: '', property_id: '', description: '' });

  const resetForm = () => { setFormData({ expense_type: '', amount: '', date: '', property_id: '', description: '' }); setEditingExpense(null); };

  const handleEdit = (item: Expense) => {
    setEditingExpense(item);
    setFormData({ expense_type: item.expense_type, amount: item.amount.toString(), date: item.date, property_id: item.property_id || '', description: item.description || '' });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expense_type || !formData.amount || !formData.date) { toast.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    const amount = parseFloat(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999) { toast.error('المبلغ يجب أن يكون رقماً موجباً ولا يتجاوز 999,999,999'); return; }
    const expenseData: Record<string, unknown> = {
      expense_type: formData.expense_type, amount, date: formData.date,
      property_id: formData.property_id || undefined, description: formData.description || undefined,
    };
    if (!editingExpense) {
      if (!fiscalYear?.id) { toast.error('يرجى اختيار سنة مالية محددة قبل إضافة مصروف'); return; }
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
      setCurrentPage(1);
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setCurrentPage(1);
  }, [sortField]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + safeNumber(item.amount), 0), [expenses]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(expenses.map((e) => e.expense_type));
    return Array.from(types).sort();
  }, [expenses]);

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

  return {
    pdfWaqfInfo, fiscalYearId, fiscalYear, isClosed, role, isLocked,
    expenses, isLoading, properties,
    createExpense, updateExpense,
    isOpen, setIsOpen, editingExpense,
    searchQuery, setSearchQuery,
    filters, setFilters,
    sortField, sortDir, handleSort,
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

export type { SortField };
