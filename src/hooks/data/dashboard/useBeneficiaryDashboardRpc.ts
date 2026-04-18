/**
 * Data hook — يجلب بيانات لوحة المستفيد عبر RPC `get_beneficiary_dashboard`.
 * مسؤولية واحدة: التواصل مع الـ backend. لا منطق صفحة هنا.
 *
 * يُستهلك من page hooks (مثل useBeneficiaryDashboardPage) ولا يُستدعى
 * من الواجهات مباشرةً (التزاماً بـ v7 Layered Architecture).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';
import type { BeneficiaryDashboardData } from '@/hooks/page/beneficiary/dashboard/useBeneficiaryDashboardData';

export const useBeneficiaryDashboardRpc = (fiscalYearId?: string) => {
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
      // RPC payload — cast مبرر، يحتاج Zod validation لاحقاً
      return data as unknown as BeneficiaryDashboardData;
    },
  });
};
