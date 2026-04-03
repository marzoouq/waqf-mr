/**
 * هوك لجلب ملخص السنوات المالية من عرض v_fiscal_year_summary
 * يُعيد إجماليات الإيرادات والمصروفات والتوزيعات لكل سنة مالية
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';

export interface FiscalYearSummary {
  fiscal_year_id: string;
  label: string;
  status: string;
  start_date: string;
  end_date: string;
  total_income: number;
  income_count: number;
  total_expenses: number;
  expense_count: number;
  net_balance: number;
  total_distributed: number;
  distribution_count: number;
  total_invoiced: number;
  paid_invoices: number;
  pending_invoices: number;
}

export const useFiscalYearSummary = () => {
  return useQuery<FiscalYearSummary[]>({
    queryKey: ['fiscal-year-summary'],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_fiscal_year_summary')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as FiscalYearSummary[];
    },
  });
};
