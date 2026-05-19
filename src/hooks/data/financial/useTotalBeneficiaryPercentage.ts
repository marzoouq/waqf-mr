import { useQuery } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { safeNumber } from '@/utils/format/safeNumber';
import { logger } from '@/lib/logger';

/**
 * Returns the global sum of all beneficiary share percentages
 * using a SECURITY DEFINER function that bypasses RLS.
 *
 * #90: أُزيل uiNotify من queryFn لمنع side effects أثناء الجلب.
 * التحذير يُسجَّل في logger فقط — المكوّن المستخدِم يمكنه عرض تحذير UI.
 */
export const useTotalBeneficiaryPercentage = () => {
  return useQuery({
    queryKey: ['total-beneficiary-percentage'],
    queryFn: async () => {
      const data = await rpc('get_total_beneficiary_percentage');
      const result = safeNumber(data);
      if (result <= 0) return 0;
      if (result > 200) {
        logger.warn(`[BeneficiaryPercentage] مجموع غير طبيعي: ${result}%`);
      }
      return result;
    },
    staleTime: STALE_FINANCIAL,
  });
};
