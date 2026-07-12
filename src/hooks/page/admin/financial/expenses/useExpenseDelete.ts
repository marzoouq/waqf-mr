/**
 * useExpenseDelete — معالج حذف مصروف مع تصحيح رقم الصفحة الحالية بعد الحذف.
 * مستخرج من useExpensesMutations لفصل المسؤوليات.
 */
import { useCallback } from 'react';

export interface ExpenseDeleteParams {
  deleteTarget: { id: string; name: string } | null;
  deleteExpense: { mutateAsync: (id: string) => Promise<unknown> };
  expensesCount: number;
  currentPage: number;
  itemsPerPage: number;
  setDeleteTarget: (target: null) => void;
  setCurrentPage: (page: number) => void;
}

export function useExpenseDelete(params: ExpenseDeleteParams) {
  const {
    deleteTarget, deleteExpense, expensesCount,
    currentPage, itemsPerPage, setDeleteTarget, setCurrentPage,
  } = params;

  return useCallback(async () => {
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
}
