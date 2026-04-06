/**
 * هوك لجلب ملخصات السنوات المالية من عرض v_fiscal_year_summary
 * يُستخدم لعرض مؤشرات إضافية (عدد السجلات، إحصائيات الفوترة) في المقارنة وغيرها
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { safeNumber } from '@/utils/format/safeNumber';

export interface FiscalYearSummary {
  fiscalYearId: string;
  label: string;
  status: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  totalDistributed: number;
  totalInvoiced: number;
  netBalance: number;
  incomeCount: number;
  expenseCount: number;
  distributionCount: number;
  paidInvoices: number;
  pendingInvoices: number;
}

function mapRow(row: Record<string, unknown>): FiscalYearSummary {
  return {
    fiscalYearId: row.fiscal_year_id as string,
    label: (row.label as string) ?? '',
    status: (row.status as string) ?? '',
    startDate: (row.start_date as string) ?? '',
    endDate: (row.end_date as string) ?? '',
    totalIncome: safeNumber(row.total_income),
    totalExpenses: safeNumber(row.total_expenses),
    totalDistributed: safeNumber(row.total_distributed),
    totalInvoiced: safeNumber(row.total_invoiced),
    netBalance: safeNumber(row.net_balance),
    incomeCount: safeNumber(row.income_count),
    expenseCount: safeNumber(row.expense_count),
    distributionCount: safeNumber(row.distribution_count),
    paidInvoices: safeNumber(row.paid_invoices),
    pendingInvoices: safeNumber(row.pending_invoices),
  };
}

/** جلب ملخص سنة مالية واحدة */
export function useFiscalYearSummary(fiscalYearId: string | undefined) {
  return useQuery<FiscalYearSummary | null>({
    queryKey: ['fiscal-year-summary', fiscalYearId],
    enabled: !!fiscalYearId,
    staleTime: STALE_FINANCIAL,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_fiscal_year_summary')
        .select('*')
        .eq('fiscal_year_id', fiscalYearId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapRow(data as Record<string, unknown>);
    },
  });
}

/** جلب ملخصات عدة سنوات — مُحسّن للمقارنة */
export function useFiscalYearSummaries(fiscalYearIds: string[]) {
  const sortedIds = [...fiscalYearIds].filter(Boolean).sort();

  return useQuery<FiscalYearSummary[]>({
    queryKey: ['fiscal-year-summaries', sortedIds],
    enabled: sortedIds.length > 0,
    staleTime: STALE_FINANCIAL,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_fiscal_year_summary')
        .select('*')
        .in('fiscal_year_id', sortedIds);
      if (error) throw error;
      return (data ?? []).map(r => mapRow(r as Record<string, unknown>));
    },
  });
}
