/**
 * هوك تنفيذ التوزيع الفعلي عبر RPC ذري (Atomic Transaction)
 * يضمن عدم تلف البيانات في حالة فشل جزئي.
 *
 * طبقة بيانات نقية: لا توستات هنا. الإشعارات للمستفيدين (`enqueueUserNotification`)
 * تبقى لأنها push notifications، ليست UI toasts.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { enqueueUserNotification } from '@/lib/services';
import { advancesKeys } from '@/lib/queryKeys/advancesKeys';
import { financialKeys } from '@/lib/queryKeys/financialKeys';

interface DistributionInput {
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_user_id?: string | null;
  share_amount: number;
  advances_paid: number;
  carryforward_deducted: number;
  net_amount: number;
  deficit: number;
}

interface DistributeParams {
  account_id: string;
  fiscal_year_id?: string;
  distributions: DistributionInput[];
  total_distributed: number;
}

export const useDistributeShares = () => {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: financialKeys.distributions.prefix });
    qc.invalidateQueries({ queryKey: financialKeys.distributions.myPrefix });
    qc.invalidateQueries({ queryKey: financialKeys.accounts.prefix });
    qc.invalidateQueries({ queryKey: advancesKeys.prefixes.requests });
    qc.invalidateQueries({ queryKey: advancesKeys.prefixes.carryforward });
  };

  return useMutation({
    mutationFn: async ({ account_id, fiscal_year_id, distributions, total_distributed }: DistributeParams) => {
      const sanitized = distributions.map(d => ({
        ...d,
        beneficiary_user_id: d.beneficiary_user_id ?? null,
      }));
      const data = await rpc<{ success: boolean; with_share: number; with_deficit: number }>('execute_distribution', {
        p_account_id: account_id,
        p_fiscal_year_id: fiscal_year_id || undefined,
        p_total_distributed: total_distributed,
        p_distributions: sanitized,
      });
      return {
        result: data,
        distributions,
      };
    },
    onSuccess: ({ distributions }) => {
      invalidateAll();
      for (const d of distributions) {
        if (d.beneficiary_user_id && d.net_amount > 0) {
          enqueueUserNotification(
            d.beneficiary_user_id,
            'صدور حصتك المالية',
            `تم توزيع حصتك بمبلغ ${d.net_amount.toLocaleString('en-US')} ر.س. يرجى مراجعة التفاصيل.`,
            'success',
            '/beneficiary/my-share',
          );
        }
      }
    },
  });
};
