/**
 * هوكات إدارة المصروفات (CRUD)
 * يوفر: useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useExpensesByFiscalYear
 * الجدول: expenses | الربط: properties | الترتيب: حسب التاريخ
 *
 * Audit-fix: الاستعلام المفلتر بالسنة المالية مدمج محلياً (كان expensesService بمستهلك واحد).
 */
import { createCrudFactory } from '../core/useCrudFactory';
import { Expense } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';
import { PER_FY_LIMIT } from '@/constants/pagination';
import { supabase } from '@/integrations/supabase/client';

export const EXPENSE_SELECT =
  'id, amount, date, description, expense_type, fiscal_year_id, property_id, created_at, property:properties(id, property_number, location)';

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

async function fetchExpensesByFiscalYear(fiscalYearId: string | 'all'): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .order('date', { ascending: false });
  if (!isFyAll(fiscalYearId)) {
    query = query.eq('fiscal_year_id', fiscalYearId).limit(PER_FY_LIMIT);
  } else {
    query = query.limit(PER_FY_LIMIT);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as Expense[];
}

/** Expenses filtered by fiscal year */
export const useExpensesByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['expenses', 'fiscal_year', fiscalYearId],
    enabled: isFyReady(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: () => fetchExpensesByFiscalYear(fiscalYearId),
    meta: { warnLimit: PER_FY_LIMIT },
  });
};
