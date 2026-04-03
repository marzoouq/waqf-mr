/**
 * هوك لجلب مؤشرات الأداء من قاعدة البيانات عبر RPC
 * بديل خفيف لحسابات المتصفح — يُستخدم في الصفحات التي لا تحتاج البيانات الكاملة
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isFyReady } from '@/constants/fiscalYearIds';

export interface DashboardKpi {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  collection_rate: number;
  total_collected: number;
  total_expected: number;
  paid_invoices: number;
  pending_invoices: number;
  overdue_invoices: number;
  active_contracts: number;
  total_distributed: number;
}

export const useDashboardKpis = (fiscalYearId?: string) => {
  return useQuery<DashboardKpi>({
    queryKey: ['dashboard-kpis', fiscalYearId ?? 'all'],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_kpis', {
        p_fiscal_year_id: fiscalYearId ?? undefined,
      });
      if (error) throw error;
      // الدالة تُعيد JSON — نحوّله للنوع المطلوب
      const result = data as unknown as DashboardKpi;
      return result;
    },
    enabled: !fiscalYearId || isFyReady(fiscalYearId),
  });
};
