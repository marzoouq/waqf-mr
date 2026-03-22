import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** شكل البيانات المُرجعة من RPC */
export interface BeneficiaryDashboardData {
  beneficiary: {
    id: string;
    name: string;
    share_percentage: number;
  } | null;
  error?: string;
  total_beneficiary_percentage: number;
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
}

/**
 * هوك موحّد يجلب جميع بيانات داشبورد المستفيد في استدعاء RPC واحد.
 * يستبدل 6 هوكات منفصلة ويكسر شلال الاستعلامات.
 */
export const useBeneficiaryDashboardData = (fiscalYearId?: string) => {
  const { user } = useAuth();
  const fyReady = !!fiscalYearId && fiscalYearId !== '__none__';

  return useQuery<BeneficiaryDashboardData>({
    queryKey: ['beneficiary-dashboard', fiscalYearId],
    enabled: !!user && fyReady,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_beneficiary_dashboard', {
        p_fiscal_year_id: fiscalYearId!,
      });
      if (error) throw error;
      return data as unknown as BeneficiaryDashboardData;
    },
  });
};
