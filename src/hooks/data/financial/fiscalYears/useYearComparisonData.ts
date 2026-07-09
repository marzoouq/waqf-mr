/**
 * هوك لجلب بيانات مقارنة السنوات المالية عبر Edge Function `year-comparison-summary`.
 * RPC مغلقة على authenticated — تُستدعى حصراً عبر Edge موثَّقة الدور.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { invoke } from '@/lib/api/invoke';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { safeNumber } from '@/utils/format/safeNumber';
import { isFyAll } from '@/constants/fiscalYearIds';
import { toMonthMap, toExpenseRecord, type MonthlyEntry, type ExpenseTypeEntry } from '@/utils/financial/collection/yearComparisonHelpers';
import { financialKeys } from '@/lib/queryKeys/financialKeys';

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
    queryKey: financialKeys.fiscalYearComparison.pair(year1Id, year2Id),
    enabled,
    staleTime: STALE_FINANCIAL,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const result = await invoke<ComparisonRpcResult>('year-comparison-summary', {
        body: { year1_id: year1Id, year2_id: year2Id },
      });
      return result;
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

  const totals = useMemo(() => {
    const pick = (y: YearSummary | undefined) => ({
      totalIncome: safeNumber(y?.total_income),
      totalExpenses: safeNumber(y?.total_expenses),
      // الحقول الرسمية من الحساب المقفل — تُستخدم كمصدر موحَّد للصافي عبر الجدول/الرسم/الـ PDF
      waqfRevenue: safeNumber(y?.account?.waqf_revenue),
      netAfterExpenses: safeNumber(y?.account?.net_after_expenses),
      netAfterVat: safeNumber(y?.account?.net_after_vat),
      vatAmount: safeNumber(y?.account?.vat_amount),
      zakatAmount: safeNumber(y?.account?.zakat_amount),
      adminShare: safeNumber(y?.account?.admin_share),
      waqifShare: safeNumber(y?.account?.waqif_share),
      distributionsAmount: safeNumber(y?.account?.distributions_amount),
    });
    return { year1: pick(data?.year1), year2: pick(data?.year2) };
  }, [data]);

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
