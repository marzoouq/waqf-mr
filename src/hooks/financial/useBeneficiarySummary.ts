/**
 * هوك لجلب ملخص بيانات المستفيد من Edge Function واحدة
 * يدمج: الحصة، التوزيعات، السُلف، الترحيلات في طلب واحد
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_REALTIME } from '@/lib/queryStaleTime';
import { logger } from '@/lib/logger';
import type { AdvanceRequest, AdvanceCarryforward } from '@/hooks/financial/useAdvanceRequests';

export interface BeneficiarySummaryData {
  beneficiary: {
    id: string;
    name: string;
    share_percentage: number;
    user_id: string;
  };
  advances: AdvanceRequest[];
  carryforwards: AdvanceCarryforward[];
  distributions: Array<{
    id: string;
    beneficiary_id: string;
    account_id: string;
    amount: number;
    date: string;
    fiscal_year_id: string;
    status: string;
    account?: { id: string; fiscal_year: string; fiscal_year_id: string } | null;
  }>;
  totalBeneficiaryPercentage: number;
  computed: {
    paidAdvancesTotal: number;
    carryforwardBalance: number;
    totalReceived: number;
    pendingAmount: number;
  };
}

export const useBeneficiarySummary = (fiscalYearId?: string) => {
  const effectiveFyId = fiscalYearId === 'all' ? undefined : fiscalYearId;

  return useQuery<BeneficiarySummaryData>({
    queryKey: ['beneficiary-summary', effectiveFyId ?? 'all'],
    staleTime: STALE_REALTIME,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('beneficiary-summary', {
        body: { fiscal_year_id: effectiveFyId },
      });
      if (error) {
        logger.error('[BeneficiarySummary] فشل جلب الملخص:', error);
        throw error;
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      return data as BeneficiarySummaryData;
    },
  });
};
