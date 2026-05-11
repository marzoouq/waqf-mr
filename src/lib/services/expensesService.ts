/**
 * expensesService — طبقة بنية تحتية لاستعلامات جدول `expenses`.
 * مستخرج من useExpenses.ts ضمن M2.1.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Expense } from '@/types';
import { isFyAll } from '@/constants/fiscalYearIds';
import { PER_FY_LIMIT } from '@/constants/pagination';

export const EXPENSE_SELECT =
  'id, amount, date, description, expense_type, fiscal_year_id, property_id, created_at, property:properties(id, property_number, location)';

export const expensesService = {
  async listByFiscalYear(fiscalYearId: string | 'all'): Promise<Expense[]> {
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
  },
};
