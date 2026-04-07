/**
 * هوك لجلب ملخص مالي لعدة سنوات في استدعاء RPC واحد
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';

/** شكل البيانات لكل سنة — متوافق مع واجهة useFinancialSummary */
export interface YearSummaryEntry {
  yearId: string;
  label: string;
  status: string;
  totalIncome: number;
  totalExpenses: number;
  vatAmount: number;
  zakatAmount: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  netAfterExpenses: number;
  netAfterVat: number;
  availableAmount: number;
  distributionsAmount: number;
  expensesByType: Record<string, number>;
}

interface RpcYearEntry {
  year_id: string;
  label: string;
  status: string;
  total_income: number;
  total_expenses: number;
  account: {
    vat_amount: number;
    zakat_amount: number;
    admin_share: number;
    waqif_share: number;
    waqf_revenue: number;
    net_after_expenses: number;
    net_after_vat: number;
    distributions_amount: number;
    waqf_corpus_manual: number;
    waqf_corpus_previous: number;
  } | null;
  expenses_by_type: Array<{ expense_type: string; total: number }>;
}

function mapEntry(raw: RpcYearEntry): YearSummaryEntry {
  const acct = raw.account;
  const waqfRevenue = acct?.waqf_revenue ?? 0;
  const corpusManual = acct?.waqf_corpus_manual ?? 0;
  const expensesByType: Record<string, number> = {};
  (raw.expenses_by_type ?? []).forEach(e => {
    expensesByType[e.expense_type] = e.total;
  });

  return {
    yearId: raw.year_id,
    label: raw.label,
    status: raw.status,
    totalIncome: raw.total_income,
    totalExpenses: raw.total_expenses,
    vatAmount: acct?.vat_amount ?? 0,
    zakatAmount: acct?.zakat_amount ?? 0,
    adminShare: acct?.admin_share ?? 0,
    waqifShare: acct?.waqif_share ?? 0,
    waqfRevenue,
    netAfterExpenses: acct?.net_after_expenses ?? 0,
    netAfterVat: acct?.net_after_vat ?? 0,
    // المبلغ المتاح للتوزيع = ريع الوقف − رقبة الوقف المُخصصة يدوياً
    availableAmount: waqfRevenue - corpusManual,
    distributionsAmount: acct?.distributions_amount ?? 0,
    expensesByType,
  };
}

export function useMultiYearSummary(yearIds: string[]) {
  const sortedIds = [...yearIds].sort();

  return useQuery<YearSummaryEntry[]>({
    queryKey: ['multi-year-summary', sortedIds],
    enabled: sortedIds.length > 0,
    staleTime: STALE_FINANCIAL,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_multi_year_summary', {
        p_year_ids: sortedIds,
      });
      if (error) throw error;
      const arr = data as unknown as RpcYearEntry[];
      return (arr ?? []).map(mapEntry);
    },
  });
}
