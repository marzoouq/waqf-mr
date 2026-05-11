/**
 * incomeService — طبقة بنية تحتية لاستعلامات جدول `income`.
 * مستخرج من useIncome.ts ضمن M2.1 — لا منطق React Query هنا، فقط نداءات Supabase.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Income } from '@/types';
import { isFyAll } from '@/constants/fiscalYearIds';
import { PER_FY_LIMIT } from '@/constants/pagination';

/** أعمدة الإيرادات مع ربط العقار — مستخدم في useIncomeByFiscalYear */
export const INCOME_SELECT =
  'id, amount, date, source, notes, fiscal_year_id, property_id, contract_id, created_at, property:properties(id, property_number, location)';

export const incomeService = {
  /** Income filtered by fiscal year (or 'all' for cross-year list) */
  async listByFiscalYear(fiscalYearId: string | 'all'): Promise<Income[]> {
    let query = supabase
      .from('income')
      .select(INCOME_SELECT)
      .order('date', { ascending: false });
    if (!isFyAll(fiscalYearId)) {
      query = query.eq('fiscal_year_id', fiscalYearId).limit(PER_FY_LIMIT);
    } else {
      query = query.limit(PER_FY_LIMIT);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as Income[];
  },
};
