/**
 * هوك لجلب بيانات مقارنة السنوات المالية عبر RPC واحد
 * يستبدل استدعاء useFinancialSummary مرتين (10 استعلامات) بطلب واحد
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { safeNumber } from '@/utils/format/safeNumber';

interface MonthlyEntry {
  month: number;
  total: number;
}

interface ExpenseTypeEntry {
  expense_type: string;
  total: number;
}

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

/** بناء خريطة شهرية من مصفوفة month/total */
function toMonthMap(entries: MonthlyEntry[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const e of entries) {
    // الـ RPC يُرجع الشهر 1-12، نحوّله إلى 0-11 للتوافق مع المكون
    map.set(e.month - 1, safeNumber(e.total));
  }
  return map;
}

/** تحويل مصفوفة expense_type/total إلى Record */
function toExpenseRecord(entries: ExpenseTypeEntry[]): Record<string, number> {
  const rec: Record<string, number> = {};
  for (const e of entries) {
    rec[e.expense_type] = safeNumber(e.total);
  }
  return rec;
}

export function useYearComparisonData(year1Id: string, year2Id: string) {
  const enabled = !!year1Id && !!year2Id && year1Id !== year2Id;

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
      return result as unknown as ComparisonRpcResult;
    },
  });

  // تحويل البيانات الخام إلى الشكل المتوقع من المكون
  const year1Monthly = useMemo(() => ({
    income: toMonthMap(data?.year1?.monthly_income ?? []),
    expenses: toMonthMap(data?.year1?.monthly_expenses ?? []),
  }), [data?.year1?.monthly_income, data?.year1?.monthly_expenses]);

  const year2Monthly = useMemo(() => ({
    income: toMonthMap(data?.year2?.monthly_income ?? []),
    expenses: toMonthMap(data?.year2?.monthly_expenses ?? []),
  }), [data?.year2?.monthly_income, data?.year2?.monthly_expenses]);

  const totals = useMemo(() => ({
    year1: {
      totalIncome: safeNumber(data?.year1?.total_income),
      totalExpenses: safeNumber(data?.year1?.total_expenses),
    },
    year2: {
      totalIncome: safeNumber(data?.year2?.total_income),
      totalExpenses: safeNumber(data?.year2?.total_expenses),
    },
  }), [data?.year1?.total_income, data?.year1?.total_expenses, data?.year2?.total_income, data?.year2?.total_expenses]);

  const expensesByType = useMemo(() => ({
    year1: toExpenseRecord(data?.year1?.expenses_by_type ?? []),
    year2: toExpenseRecord(data?.year2?.expenses_by_type ?? []),
  }), [data?.year1?.expenses_by_type, data?.year2?.expenses_by_type]);

  return {
    isLoading,
    year1Monthly,
    year2Monthly,
    totals,
    expensesByType,
  };
}
