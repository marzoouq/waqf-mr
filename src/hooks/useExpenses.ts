/**
 * هوكات إدارة المصروفات (CRUD)
 * يوفر: useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useExpensesByFiscalYear
 * الجدول: expenses | الربط: properties | الترتيب: حسب التاريخ
 * عند إضافة مصروف جديد: يتم إرسال إشعار تلقائي لجميع المستفيدين
 */
import { createCrudFactory } from './useCrudFactory';
import { Expense } from '@/types/database';
// notifyAllBeneficiaries removed — notifications sent at distribution/close instead
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const expensesCrud = createCrudFactory<'expenses', Expense>({
  table: 'expenses',
  queryKey: 'expenses',
  select: '*, property:properties(*)',
  orderBy: 'date',
  label: 'المصروف',
  // FIX #4: Removed automatic notifyAllBeneficiaries — was spamming beneficiaries on every single expense entry.
  // Notifications are sent at distribution/fiscal-year-close instead.
});

export const useExpenses = expensesCrud.useList;
export const useCreateExpense = expensesCrud.useCreate;
export const useUpdateExpense = expensesCrud.useUpdate;
export const useDeleteExpense = expensesCrud.useDelete;

/** Expenses filtered by fiscal year */
export const useExpensesByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['expenses', 'fiscal_year', fiscalYearId],
    enabled: fiscalYearId !== '__none__',
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase.from('expenses').select('*, property:properties(*)').order('date', { ascending: false }).limit(200);
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
  });
};
