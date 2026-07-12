/**
 * useExpensesMutations — واجهة موحّدة (facade) تجمع معالجي الإرسال والحذف.
 * المنطق الفعلي مقسّم في expenses/useExpenseSubmit و expenses/useExpenseDelete.
 */
import { useExpenseSubmit, type ExpenseSubmitParams } from './expenses/useExpenseSubmit';
import { useExpenseDelete, type ExpenseDeleteParams } from './expenses/useExpenseDelete';

type Params = ExpenseSubmitParams & ExpenseDeleteParams;

export function useExpensesMutations(params: Params) {
  const handleSubmit = useExpenseSubmit(params);
  const handleConfirmDelete = useExpenseDelete(params);
  return { handleSubmit, handleConfirmDelete };
}
