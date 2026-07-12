/**
 * معالجات mutations لصفحة المصروفات — مستخرجة من useExpensesPage لتقليل الحجم.
 * تدعم رفع مرفقات متعددة (فواتير) وربطها بالمصروف عبر invoices.expense_id.
 */
import { useCallback } from 'react';
import { uiNotify } from '@/lib/notify';
import {
  validateExpenseForm,
  getExpenseFieldErrors,
  type ExpenseFieldErrors,
} from '@/utils/financial/expenses/expenseFormValidation';
import { uploadExpenseAttachments } from '@/lib/expenses/uploadExpenseAttachments';
import type { Expense } from '@/types';
import type { StagedFile } from '@/hooks/ui/useMultipleFilesUpload';

type ExpenseFormState = {
  expense_type: string;
  amount: string;
  date: string;
  property_id: string;
  description: string;
};

type PostCreateVoucher = { id: string; amount: number; description: string };

interface Params {
  formData: ExpenseFormState;
  editingExpense: Expense | null;
  fiscalYear: { id: string } | null | undefined;
  expensesCount: number;
  currentPage: number;
  itemsPerPage: number;
  deleteTarget: { id: string; name: string } | null;
  createExpense: { mutateAsync: (data: unknown) => Promise<{ id?: string } | undefined> };
  updateExpense: { mutateAsync: (data: unknown) => Promise<unknown> };
  deleteExpense: { mutateAsync: (id: string) => Promise<unknown> };
  createInvoice: { mutateAsync: (data: unknown) => Promise<unknown> };
  stagedFiles: StagedFile[];
  resetStagedFiles: () => void;
  setErrors: (errors: ExpenseFieldErrors) => void;
  setIsOpen: (open: boolean) => void;
  resetForm: () => void;
  setDeleteTarget: (target: null) => void;
  setCurrentPage: (page: number) => void;
  setPostCreateVoucherFor: (v: PostCreateVoucher | null) => void;
}


export function useExpensesMutations(params: Params) {
  const {
    formData, editingExpense, fiscalYear,
    expensesCount, currentPage, itemsPerPage, deleteTarget,
    createExpense, updateExpense, deleteExpense, createInvoice,
    stagedFiles, resetStagedFiles,
    setErrors, setIsOpen, resetForm, setDeleteTarget, setCurrentPage, setPostCreateVoucherFor,
  } = params;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateExpenseForm(formData);
    if (!result.success) {
      setErrors(getExpenseFieldErrors(formData));
      uiNotify.error(result.error);
      return;
    }
    setErrors({});
    const { amount } = result.data;
    const expenseData: Record<string, unknown> = { ...result.data };
    if (!editingExpense) {
      if (!fiscalYear?.id) {
        uiNotify.error('يرجى اختيار سنة مالية محددة قبل إضافة مصروف');
        return;
      }
      expenseData.fiscal_year_id = fiscalYear.id;
    }

    const activeFiscalYearId = editingExpense
      ? (editingExpense.fiscal_year_id as string)
      : fiscalYear?.id;

    try {
      let expenseId: string | undefined;
      if (editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.id, ...expenseData });
        expenseId = editingExpense.id;
      } else {
        const created = await createExpense.mutateAsync(expenseData);
        expenseId = created?.id;
      }

      // رفع المرفقات (إن وُجدت)
      let failedCount = 0;
      if (expenseId && stagedFiles.length > 0 && activeFiscalYearId) {
        failedCount = await uploadExpenseAttachments({
          files: stagedFiles,
          expenseId,
          expenseType: result.data.expense_type,
          amount,
          date: result.data.date,
          propertyId: result.data.property_id || null,
          fiscalYearId: activeFiscalYearId,
          description: result.data.description || null,
          createInvoice,
        });
        const uploaded = stagedFiles.length - failedCount;
        if (failedCount > 0) {
          uiNotify.error(`تم رفع ${uploaded} من ${stagedFiles.length} مرفق — فشل ${failedCount}`);
        } else if (uploaded > 0) {
          uiNotify.success(`تم إرفاق ${uploaded} فاتورة بالمصروف`);
        }
      }

      // فتح نافذة سند صرف بعد إنشاء مصروف جديد فقط
      if (!editingExpense && expenseId) {
        setPostCreateVoucherFor({
          id: expenseId,
          amount,
          description: result.data.description || result.data.expense_type,
        });
      }

      resetStagedFiles();
      setIsOpen(false);
      resetForm();
    } catch {
      // onError on mutation already surfaces toast
    }
  }, [
    formData, editingExpense, fiscalYear, createExpense, updateExpense, createInvoice,
    stagedFiles, resetStagedFiles,
    setErrors, setIsOpen, resetForm, setPostCreateVoucherFor,
  ]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      const totalAfterDelete = expensesCount - 1;
      const maxPage = Math.ceil(totalAfterDelete / itemsPerPage);
      if (currentPage > maxPage) setCurrentPage(Math.max(1, maxPage));
    } catch {
      // onError on mutation already surfaces toast
    }
  }, [deleteTarget, deleteExpense, expensesCount, currentPage, itemsPerPage, setDeleteTarget, setCurrentPage]);

  return { handleSubmit, handleConfirmDelete };
}
