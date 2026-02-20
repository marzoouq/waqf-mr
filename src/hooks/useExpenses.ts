/**
 * هوكات إدارة المصروفات (CRUD)
 * يوفر: useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useExpensesByFiscalYear
 * الجدول: expenses | الربط: properties | الترتيب: حسب التاريخ
 * عند إضافة مصروف جديد: يتم إرسال إشعار تلقائي لجميع المستفيدين
 */
import { createCrudFactory } from './useCrudFactory';
import { Expense } from '@/types/database';
import { notifyAllBeneficiaries } from '@/utils/notifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const expensesCrud = createCrudFactory<'expenses', Expense>({
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

/** Expenses filtered by fiscal year */
export const useExpensesByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['expenses', 'fiscal_year', fiscalYearId],
    queryFn: async () => {
      let query = supabase.from('expenses').select('*, property:properties(*)').order('date', { ascending: false }).limit(500);
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
  });
};
