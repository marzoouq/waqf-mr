/**
 * مقارنة الدخل عبر السنوات المالية — مستخرج من useAnnualReport
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_STATIC } from '@/lib/queryStaleTime';
import { safeNumber } from '@/utils/format/safeNumber';

export interface IncomeComparison {
  label: string;
  total: number;
}

export const useIncomeComparison = () => {
  return useQuery({
    queryKey: ['income_comparison'],
    queryFn: async () => {
      // جلب آخر 4 سنوات مالية
      const { data: years, error: fyErr } = await supabase
        .from('fiscal_years')
        .select('id, label')
        .order('start_date', { ascending: false })
        .limit(4);
      if (fyErr) throw fyErr;
      if (!years?.length) return [];

      // جلب كل الدخل لهذه السنوات في استعلام واحد (بدلاً من N+1)
      const yearIds = years.map(y => y.id);
      const { data: allIncome, error: incErr } = await supabase
        .from('income')
        .select('fiscal_year_id, amount')
        .in('fiscal_year_id', yearIds);
      if (incErr) throw incErr;

      // تجميع الدخل حسب السنة المالية
      const totalsMap = new Map<string, number>();
      for (const row of allIncome || []) {
        const current = totalsMap.get(row.fiscal_year_id!) || 0;
        totalsMap.set(row.fiscal_year_id!, current + safeNumber(row.amount));
      }

      const results: IncomeComparison[] = years.map(fy => ({
        label: fy.label,
        total: totalsMap.get(fy.id) || 0,
      }));

      return results.reverse(); // الأقدم أولاً
    },
    staleTime: STALE_STATIC,
  });
};
