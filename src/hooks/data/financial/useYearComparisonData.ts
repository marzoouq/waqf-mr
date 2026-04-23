/**
 * هوك لجلب بيانات مقارنة السنوات المالية عبر RPC واحد
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { safeNumber } from '@/utils/format/safeNumber';
import { isFyAll } from '@/constants/fiscalYearIds';
import { toMonthMap, toExpenseRecord, type MonthlyEntry, type ExpenseTypeEntry } from '@/utils/financial/yearComparisonHelpers';

interface YearSummary {
  total_income: number;
  total_expenses: number;
  account: {
    vat_amount: number;
    zakat_amount: number;
    admin_share: number;
    waqif_share: number;
    waqf_revenue: number;
    distributions_amount: number;
    net_after_expenses: number;
    net_after_vat: number;
  } | null;
  monthly_income: MonthlyEntry[];
  monthly_expenses: MonthlyEntry[];
  expenses_by_type: ExpenseTypeEntry[];
}

interface ComparisonRpcResult {
  year1: YearSummary;
  year2: YearSummary;
}

export function useYearComparisonData(year1Id: string, year2Id: string) {
  // تعطيل عند 'all' — ليس UUID حقيقي (#46)
  const enabled = !!year1Id && !!year2Id && year1Id !== year2Id
    && !isFyAll(year1Id) && !isFyAll(year2Id);

  const { data, isLoading } = useQuery<ComparisonRpcResult>({
    queryKey: ['year-comparison-summary', year1Id, year2Id],
    enabled,
    staleTime: STALE_FINANCIAL,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data: result, error } = await supabase.rpc('get_year_comparison_summary', {
        p_year1_id: year1Id,
        p_year2_id: year2Id,
      });
      if (error) throw error;
      // RPC — cast مبرر، يحتاج Zod validation لاحقاً
      return result as unknown as ComparisonRpcResult;
    },
  });

  // تبسيط dependencies — الاعتماد على data كاملاً (#31)
  const year1Monthly = useMemo(() => ({
    income: toMonthMap(data?.year1?.monthly_income ?? []),
    expenses: toMonthMap(data?.year1?.monthly_expenses ?? []),
  }), [data]);

  const year2Monthly = useMemo(() => ({
    income: toMonthMap(data?.year2?.monthly_income ?? []),
    expenses: toMonthMap(data?.year2?.monthly_expenses ?? []),
  }), [data]);

  const totals = useMemo(() => ({
    year1: {
      totalIncome: safeNumber(data?.year1?.total_income),
      totalExpenses: safeNumber(data?.year1?.total_expenses),
    },
    year2: {
      totalIncome: safeNumber(data?.year2?.total_income),
      totalExpenses: safeNumber(data?.year2?.total_expenses),
    },
  }), [data]);

  const expensesByType = useMemo(() => ({
    year1: toExpenseRecord(data?.year1?.expenses_by_type ?? []),
    year2: toExpenseRecord(data?.year2?.expenses_by_type ?? []),
  }), [data]);

  return {
    isLoading,
    year1Monthly,
    year2Monthly,
    totals,
    expensesByType,
  };
}
