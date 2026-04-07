import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';

/** شكل البيانات المُرجعة من RPC */
export interface BeneficiaryDashboardData {
  beneficiary: {
    id: string;
    name: string;
    share_percentage: number;
    user_id: string;
  } | null;
  error?: string;
  total_beneficiary_percentage: number;
  /** #12 — عدد المستفيدين الفعلي من DB */
  beneficiary_count: number;
  /** #13 — نسبة حصة الناظر من app_settings */
  admin_share_pct: number;
  /** #13 — نسبة حصة الواقف من app_settings */
  waqif_share_pct: number;
  fiscal_year: {
    id: string;
    label: string;
    status: string;
    start_date: string;
    end_date: string;
  } | null;
  total_income: number;
  total_expenses: number;
  account: {
    admin_share: number;
    waqif_share: number;
    waqf_revenue: number;
    vat_amount: number;
    zakat_amount: number;
    net_after_expenses: number;
    net_after_vat: number;
    waqf_corpus_manual: number;
    waqf_corpus_previous: number;
    distributions_amount: number;
  } | null;
  available_amount: number;
  my_share: number;
  recent_distributions: Array<{
    id: string;
    amount: number;
    date: string;
    status: string;
  }>;
  pending_advance_count: number;
  advance_settings: {
    enabled?: boolean;
    min_amount?: number;
    max_percentage?: number;
  } | null;
  income_by_source: Array<{ source: string; total: number }>;
  expenses_by_type_excluding_vat: Array<{ expense_type: string; total: number }>;
  monthly_income: Array<{ month: number; total: number }>;
  monthly_expenses: Array<{ month: number; total: number }>;
  /** #16 — طلبات السُلف الخاصة بالمستفيد */
  my_advances: Array<{
    id: string;
    beneficiary_id: string;
    fiscal_year_id: string | null;
    amount: number;
    reason: string | null;
    status: string;
    rejection_reason: string | null;
    approved_by: string | null;
    approved_at: string | null;
    paid_at: string | null;
    created_at: string;
  }>;
  /** #16 — إجمالي السُلف المدفوعة */
  paid_advances_total: number;
  /** #16 — ترحيلات المستفيد */
  my_carryforwards: Array<{
    id: string;
    beneficiary_id: string;
    from_fiscal_year_id: string;
    to_fiscal_year_id: string | null;
    amount: number;
    status: string;
    notes: string | null;
    created_at: string;
  }>;
  /** #16 — رصيد الترحيل النشط */
  carryforward_balance: number;
}

/**
 * هوك موحّد يجلب جميع بيانات داشبورد المستفيد في استدعاء RPC واحد.
 */
export const useBeneficiaryDashboardData = (fiscalYearId?: string) => {
  const { user } = useAuth();
  const fyReady = isFyReady(fiscalYearId);

  return useQuery<BeneficiaryDashboardData>({
    queryKey: ['beneficiary-dashboard', user?.id, fiscalYearId],
    enabled: !!user && fyReady && !isFyAll(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_beneficiary_dashboard', {
        p_fiscal_year_id: fiscalYearId!,
      });
      if (error) throw error;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(`استجابة غير متوقعة: ${typeof data} بدلاً من object`);
      }
      return data as unknown as BeneficiaryDashboardData;
    },
  });
};
