import { useQuery } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import type { BeneficiaryDashboardKpis } from '@/types/rpc';

export const useBeneficiaryDashboardRpc = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['beneficiary-dashboard-kpis'],
    queryFn: async ({ signal }) => {
      return rpc<BeneficiaryDashboardKpis>('get_beneficiary_dashboard_kpis', {}, { signal });
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
