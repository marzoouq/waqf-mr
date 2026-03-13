/**
 * هوكات إدارة المصروفات (CRUD)
 * يوفر: useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useExpensesByFiscalYear
 * الجدول: expenses | الربط: properties | الترتيب: حسب التاريخ
 */
import { createCrudFactory } from './useCrudFactory';
import { Expense } from '@/types/database';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const expensesCrud = createCrudFactory<'expenses', Expense>({
  table: 'expenses',
  queryKey: 'expenses',
  select: '*, property:properties(*)',
  orderBy: 'date',
  label: 'المصروف',
});

export const useExpenses = expensesCrud.useList;
export const useCreateExpense = expensesCrud.useCreate;
export const useUpdateExpense = expensesCrud.useUpdate;
export const useDeleteExpense = expensesCrud.useDelete;

const PER_FY_LIMIT = 2000;

/** Expenses filtered by fiscal year */
export const useExpensesByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['expenses', 'fiscal_year', fiscalYearId],
    enabled: fiscalYearId !== '__none__',
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase.from('expenses').select('*, property:properties(*)').order('date', { ascending: false });
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId).limit(PER_FY_LIMIT);
      } else {
        query = query.limit(1000);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length >= PER_FY_LIMIT) {
        toast.warning('تم عرض أول 2,000 سجل مصروفات — قد توجد سجلات إضافية. يُرجى تضييق الفلترة.');
      }
      return data as Expense[];
    },
  });
};
