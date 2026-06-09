/**
 * طبقة البيانات: جلب آخر 4 سنوات مالية + جميع سجلات الدخل الخاصة بها (raw rows).
 * المنطق الحسابي (التجميع/التحويل) موجود في طبقة domain:
 *   `src/hooks/domain/financial/useIncomeComparison.ts`
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_STATIC } from '@/lib/queryStaleTime';
import { financialKeys } from '@/lib/queryKeys/financialKeys';

export interface IncomeComparison {
  label: string;
  total: number;
}

export interface IncomeComparisonRaw {
  years: Array<{ id: string; label: string }>;
  income: Array<{ fiscal_year_id: string | null; amount: number | null }>;
}

export const useIncomeComparisonRaw = () => {
  return useQuery({
    queryKey: financialKeys.income.comparison(),
    queryFn: async (): Promise<IncomeComparisonRaw> => {
      const { data: years, error: fyErr } = await supabase
        .from('fiscal_years')
        .select('id, label')
        .order('start_date', { ascending: false })
        .limit(4);
      if (fyErr) throw fyErr;
      if (!years?.length) return { years: [], income: [] };

      const yearIds = years.map(y => y.id);
      const { data: allIncome, error: incErr } = await supabase
        .from('income')
        .select('fiscal_year_id, amount')
        .in('fiscal_year_id', yearIds);
      if (incErr) throw incErr;

      return { years, income: allIncome ?? [] };
    },
    staleTime: STALE_STATIC,
  });
};
