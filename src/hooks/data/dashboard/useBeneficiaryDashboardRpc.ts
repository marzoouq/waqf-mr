/**
 * Data hook — يجلب بيانات لوحة المستفيد عبر RPC `get_beneficiary_dashboard`.
 * مسؤولية واحدة: التواصل مع الـ backend. لا منطق صفحة هنا.
 *
 * يُستهلك من page hooks (مثل useBeneficiaryDashboardPage) ولا يُستدعى
 * من الواجهات مباشرةً (التزاماً بـ v7 Layered Architecture).
 */
import { useQuery } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';
import type { BeneficiaryDashboardData } from './types';
import { beneficiariesKeys } from '@/lib/queryKeys/beneficiariesKeys';

export const useBeneficiaryDashboardRpc = (fiscalYearId?: string) => {
  const { user } = useAuth();
  const fyReady = isFyReady(fiscalYearId);

  return useQuery<BeneficiaryDashboardData>({
    queryKey: beneficiariesKeys.dashboard(user?.id, fiscalYearId),
    enabled: !!user && fyReady && !isFyAll(fiscalYearId),
    staleTime: STALE_FINANCIAL,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const data = await rpc('get_beneficiary_dashboard', {
        p_fiscal_year_id: fiscalYearId!,
      }, { signal });
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(`استجابة غير متوقعة: ${typeof data} بدلاً من object`);
      }
      return data as unknown as BeneficiaryDashboardData;
    },
  });
};
