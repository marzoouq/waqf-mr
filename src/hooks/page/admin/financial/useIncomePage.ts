/**
 * هوك منطق صفحة الدخل — الحالة والفلترة والترتيب
 */
import { useState, useMemo, useCallback } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { MAX_FINANCIAL_AMOUNT, MAX_FINANCIAL_AMOUNT_MESSAGE } from '@/constants/limits';
import { safeNumber } from '@/utils/format/safeNumber';
import { canModifyFiscalYear } from '@/utils/auth/permissions';
import type { SortFieldOf } from '@/types/sorting';
import { useCreateIncome, useUpdateIncome, useDeleteIncome, useIncomeByFiscalYear } from '@/hooks/data/financial/useIncome';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/hooks/auth/useAuthContext';
import type { Income } from '@/types/database';
import { EMPTY_FILTERS, type FilterState } from '@/types/ui';
import { defaultNotify } from '@/lib/notify';
import { useTableSort } from '@/hooks/ui/useTableSort';
import { computeLowIncomeMonths } from '@/utils/financial/incomeAnomalies';

export type SortField = SortFieldOf<'amount' | 'date' | 'source'>;

const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

const EMPTY_INCOME_FORM = { source: '', amount: '', date: '', property_id: '', notes: '' };

export function useIncomePage() {
  const { fiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const { role } = useAuth();
  const isLocked = !canModifyFiscalYear(role, isClosed);

  const { data: income = [], isLoading } = useIncomeByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId);
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();

  const [isOpen, setIsOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const { sortField, sortDir, handleSort } = useTableSort<'amount' | 'date' | 'source'>();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState(EMPTY_INCOME_FORM);

  const resetForm = useCallback(() => { setFormData(EMPTY_INCOME_FORM); setEditingIncome(null); }, []);

  const handleEdit = useCallback((item: Income) => {
    setEditingIncome(item);
    setFormData({ source: item.source, amount: item.amount.toString(), date: item.date, property_id: item.property_id || '', notes: item.notes || '' });
    setIsOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.source || !formData.amount || !formData.date) { defaultNotify.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    const amount = parseFloat(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_FINANCIAL_AMOUNT) { defaultNotify.error(MAX_FINANCIAL_AMOUNT_MESSAGE); return; }
    const incomeData: Record<string, unknown> = {
      source: formData.source, amount, date: formData.date,
      property_id: formData.property_id || undefined, notes: formData.notes || undefined,
    };
    if (!editingIncome) {
      if (!fiscalYear?.id) {
        defaultNotify.error('يرجى اختيار سنة مالية محددة لإضافة سجل دخل');
        return;
      }
      incomeData.fiscal_year_id = fiscalYear.id;
    }
    try {
      if (editingIncome) {
        type UpdateArg = Parameters<typeof updateIncome.mutateAsync>[0];
        await updateIncome.mutateAsync({ id: editingIncome.id, ...incomeData } as UpdateArg);
      } else {
        type CreateArg = Parameters<typeof createIncome.mutateAsync>[0];
        await createIncome.mutateAsync(incomeData as CreateArg);
      }
      setIsOpen(false);
      resetForm();
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteIncome.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      // البقاء في الصفحة الحالية ما لم تصبح فارغة
      const totalAfterDelete = income.length - 1;
      const maxPage = Math.ceil(totalAfterDelete / ITEMS_PER_PAGE);
      if (currentPage > maxPage) setCurrentPage(Math.max(1, maxPage));
    } catch {
      // handled by mutation
    }
  };

  const totalIncome = useMemo(() => income.reduce((sum, item) => sum + safeNumber(item.amount), 0), [income]);

  const uniqueSources = useMemo(() => {
    const sources = new Set(income.map((i) => i.source));
    return Array.from(sources).sort();
  }, [income]);

  const lowIncomeMonths = useMemo(() => computeLowIncomeMonths(income), [income]);

  const summaryCards = useMemo(() => {
    const count = income.length;
    const avg = count > 0 ? Math.round(totalIncome / count) : 0;
    const sourceMap = new Map<string, number>();
    income.forEach(i => sourceMap.set(i.source, (sourceMap.get(i.source) || 0) + safeNumber(i.amount)));
    let topSource = '-';
    let topSourceAmount = 0;
    sourceMap.forEach((amount, source) => { if (amount > topSourceAmount) { topSourceAmount = amount; topSource = source; } });
    return { count, avg, topSource, topSourceAmount };
  }, [income, totalIncome]);

  const filteredIncome = useMemo(() => {
    let result = income.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.source.toLowerCase().includes(q) && !(item.notes || '').toLowerCase().includes(q) && !item.date.includes(q)) return false;
      }
      if (filters.category && item.source !== filters.category) return false;
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
        else if (sortField === 'source') cmp = a.source.localeCompare(b.source, 'ar');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [income, searchQuery, filters, sortField, sortDir]);

  const paginatedItems = useMemo(
    () => filteredIncome.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredIncome, currentPage],
  );

  /** هل السنة المالية محددة ويمكن الإضافة؟ — #14 */
  const canAdd = !!fiscalYear?.id && !isLocked;

  return {
    // بيانات
    income, isLoading, properties, contracts, paymentInvoices,
    fiscalYearId, fiscalYear, isClosed, role, isLocked, canAdd,
    // حالة النموذج
    isOpen, setIsOpen, editingIncome, formData, setFormData,
    resetForm, handleEdit, handleSubmit,
    createPending: createIncome.isPending,
    updatePending: updateIncome.isPending,
    // حذف
    deleteTarget, setDeleteTarget, handleConfirmDelete,
    // ترتيب — sortField قد يكون null
    sortField: sortField as SortField, sortDir, handleSort: handleSort as (field: SortField) => void,
    // فلاتر — تبقى مُطبّقة بعد إغلاق form (سلوك مقصود)
    searchQuery, setSearchQuery, filters, setFilters,
    // صفحات
    currentPage, setCurrentPage, ITEMS_PER_PAGE,
    // حسابات
    totalIncome, uniqueSources, lowIncomeMonths, summaryCards, filteredIncome, paginatedItems,
  };
}
