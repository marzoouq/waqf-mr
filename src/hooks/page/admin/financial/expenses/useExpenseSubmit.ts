/**
 * useExpenseSubmit — معالج إرسال نموذج المصروف (إنشاء/تحديث) مع رفع المرفقات.
 * مستخرج من useExpensesMutations لتقليل الحجم وفصل المسؤوليات.
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

export type ExpenseFormState = {
  expense_type: string;
  amount: string;
  date: string;
  property_id: string;
  description: string;
};

export type PostCreateVoucher = { id: string; amount: number; description: string };

export interface ExpenseSubmitParams {
  formData: ExpenseFormState;
  editingExpense: Expense | null;
  fiscalYear: { id: string } | null | undefined;
  createExpense: { mutateAsync: (data: unknown) => Promise<{ id?: string } | undefined> };
  updateExpense: { mutateAsync: (data: unknown) => Promise<unknown> };
  createInvoice: { mutateAsync: (data: unknown) => Promise<unknown> };
  stagedFiles: StagedFile[];
  resetStagedFiles: () => void;
  setErrors: (errors: ExpenseFieldErrors) => void;
  setIsOpen: (open: boolean) => void;
  resetForm: () => void;
  setPostCreateVoucherFor: (v: PostCreateVoucher | null) => void;
}

export function useExpenseSubmit(params: ExpenseSubmitParams) {
  const {
    formData, editingExpense, fiscalYear,
    createExpense, updateExpense, createInvoice,
    stagedFiles, resetStagedFiles,
    setErrors, setIsOpen, resetForm, setPostCreateVoucherFor,
  } = params;

  return useCallback(async (e: React.FormEvent) => {
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
      if (expenseId && stagedFiles.length > 0 && activeFiscalYearId) {
        const failedCount = await uploadExpenseAttachments({
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
}
