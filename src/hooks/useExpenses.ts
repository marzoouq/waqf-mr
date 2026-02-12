import { useCrudFactory } from './useCrudFactory';
import { Expense } from '@/types/database';
import { notifyAllBeneficiaries } from '@/utils/notifications';

const expensesCrud = useCrudFactory<'expenses', Expense>({
  table: 'expenses',
  queryKey: 'expenses',
  select: '*, property:properties(*)',
  orderBy: 'date',
  label: 'المصروف',
  onCreateSuccess: (data) => {
    notifyAllBeneficiaries(
      'مصروف جديد',
      `تم تسجيل مصروف جديد (${data.expense_type}) بمبلغ ${Number(data.amount).toLocaleString('ar-SA')} ريال`,
      'payment',
      '/beneficiary/disclosure',
    );
  },
});

export const useExpenses = expensesCrud.useList;
export const useCreateExpense = expensesCrud.useCreate;
export const useUpdateExpense = expensesCrud.useUpdate;
export const useDeleteExpense = expensesCrud.useDelete;
