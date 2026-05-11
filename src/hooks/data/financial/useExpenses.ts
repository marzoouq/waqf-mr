/**
 * هوكات إدارة المصروفات (CRUD)
 * يوفر: useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useExpensesByFiscalYear
 * الجدول: expenses | الربط: properties | الترتيب: حسب التاريخ
 *
 * M2.1: استعلام fiscal-year-filtered يمر عبر expensesService.
 */
import { createCrudFactory } from '../core/useCrudFactory';
import { Expense } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isFyReady } from '@/constants/fiscalYearIds';
import { PER_FY_LIMIT } from '@/constants/pagination';
import { expensesService, EXPENSE_SELECT } from '@/lib/services/expensesService';

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

/** Expenses filtered by fiscal year */
export const useExpensesByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['expenses', 'fiscal_year', fiscalYearId],
    enabled: isFyReady(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: () => expensesService.listByFiscalYear(fiscalYearId),
    meta: { warnLimit: PER_FY_LIMIT },
  });
};
