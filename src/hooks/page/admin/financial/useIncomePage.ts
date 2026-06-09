/**
 * هوك منطق صفحة الدخل — الحالة والفلترة والترتيب
 */
import { useState, useMemo, useCallback } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { validateIncomeForm, getIncomeFieldErrors, type IncomeFieldErrors, type IncomeFormInput } from '@/utils/financial/collection/incomeFormValidation';
import { safeNumber } from '@/utils/format/safeNumber';
import { canModifyFiscalYear } from '@/utils/auth/permissions';
import type { SortFieldOf } from '@/types/sorting';
import { useCreateIncome, useUpdateIncome, useDeleteIncome, useIncomeByFiscalYear } from '@/hooks/data/financial/income/useIncome';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import type { Income } from '@/types';
import { EMPTY_FILTERS, type FilterState } from '@/types/ui';
import { uiNotify } from '@/lib/notify';
import { useTableSort } from '@/hooks/ui/useTableSort';
import { computeLowIncomeMonths } from '@/utils/financial/collection/incomeAnomalies';
import { buildIncomeSummaryCards, filterAndSortIncome } from '@/utils/financial/collection/incomeCompute';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { useIncomeExporters } from './useIncomeExporters';

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
  const pdfWaqfInfo = usePdfWaqfInfo();

  const [isOpen, setIsOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const { sortField, sortDir, handleSort } = useTableSort<'amount' | 'date' | 'source'>();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormDataRaw] = useState(EMPTY_INCOME_FORM);
  const [errors, setErrors] = useState<IncomeFieldErrors>({});

  const setFormData = useCallback((data: typeof EMPTY_INCOME_FORM) => {
    setFormDataRaw(data);
    setErrors((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  const onFieldBlur = useCallback((field: keyof IncomeFormInput) => {
    setFormDataRaw((current) => {
      const fieldErrors = getIncomeFieldErrors(current);
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
      return current;
    });
  }, []);

  const resetForm = useCallback(() => { setFormDataRaw(EMPTY_INCOME_FORM); setEditingIncome(null); setErrors({}); }, []);

  const handleEdit = useCallback((item: Income) => {
    setEditingIncome(item);
    setFormDataRaw({ source: item.source, amount: item.amount.toString(), date: item.date, property_id: item.property_id || '', notes: item.notes || '' });
    setErrors({});
    setIsOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateIncomeForm(formData);
    if (!result.success) {
      setErrors(getIncomeFieldErrors(formData));
      uiNotify.error(result.error);
      return;
    }
    setErrors({});
    const incomeData: Record<string, unknown> = { ...result.data };

    if (!editingIncome) {
      if (!fiscalYear?.id) {
        uiNotify.error('يرجى اختيار سنة مالية محددة لإضافة سجل دخل');
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

  const summaryCards = useMemo(
    () => buildIncomeSummaryCards(income, totalIncome),
    [income, totalIncome],
  );

  const filteredIncome = useMemo(
    () => filterAndSortIncome(income, searchQuery, filters, sortField ?? null, sortDir),
    [income, searchQuery, filters, sortField, sortDir],
  );

  const paginatedItems = useMemo(
    () => filteredIncome.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredIncome, currentPage],
  );

  /** هل السنة المالية محددة ويمكن الإضافة؟ — #14 */
  const canAdd = !!fiscalYear?.id && !isLocked;
  const { handleExportPdf, handleExportCsv } = useIncomeExporters(filteredIncome, totalIncome, pdfWaqfInfo);

  return {
    income, isLoading, properties, contracts, paymentInvoices,
    fiscalYearId, fiscalYear, isClosed, role, isLocked, canAdd,
    isOpen, setIsOpen, editingIncome, formData, setFormData, errors, onFieldBlur,
    resetForm, handleEdit, handleSubmit,
    createPending: createIncome.isPending,
    updatePending: updateIncome.isPending,
    deleteTarget, setDeleteTarget, handleConfirmDelete,
    sortField: sortField as SortField, sortDir, handleSort: handleSort as (field: SortField) => void,
    searchQuery, setSearchQuery, filters, setFilters,
    currentPage, setCurrentPage, ITEMS_PER_PAGE,
    totalIncome, uniqueSources, lowIncomeMonths, summaryCards, filteredIncome, paginatedItems,
    pdfWaqfInfo,
    handleExportPdf, handleExportCsv,
  };
}
