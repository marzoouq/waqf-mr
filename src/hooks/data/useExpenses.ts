/**
 * هوكات إدارة المصروفات (CRUD)
 * يوفر: useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useExpensesByFiscalYear
 * الجدول: expenses | الربط: properties | الترتيب: حسب التاريخ
 */
import { createCrudFactory } from './useCrudFactory';
import { Expense } from '@/types/database';
import { useQuery } from '@tanstack/react-query';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from './mutationNotify';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';

/** أعمدة المصروفات مع ربط العقار */
const EXPENSE_SELECT = 'id, amount, date, description, expense_type, fiscal_year_id, property_id, created_at, property:properties(id, property_number, location)';

const expensesCrud = createCrudFactory<'expenses', Expense>({
  table: 'expenses',
  queryKey: 'expenses',
  select: EXPENSE_SELECT,
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
    enabled: isFyReady(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      let query = supabase.from('expenses').select(EXPENSE_SELECT).order('date', { ascending: false });
      if (!isFyAll(fiscalYearId)) {
        query = query.eq('fiscal_year_id', fiscalYearId).limit(PER_FY_LIMIT);
      } else {
        query = query.limit(1000);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length >= PER_FY_LIMIT) {
        defaultNotify.warning('تم عرض أول 2,000 سجل مصروفات — قد توجد سجلات إضافية. يُرجى تضييق الفلترة.');
      }
      return data as Expense[];
    },
  });
};
