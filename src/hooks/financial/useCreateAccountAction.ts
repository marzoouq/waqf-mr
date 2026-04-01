/**
 * حفظ الحسابات الختامية — مفصول من useAccountsActions
 */
import { useCreateAccount } from '@/hooks/financial/useAccounts';
import { notifyAllBeneficiaries } from '@/utils/notifications';
import { defaultNotify } from '@/hooks/data/mutationNotify';
import { logger } from '@/lib/logger';

interface CreateAccountParams {
  buildAccountData: () => Record<string, unknown>;
  getFiscalYearLabel: () => string;
  getDistributionsAmount: () => number;
}

export function useCreateAccountAction({ buildAccountData, getFiscalYearLabel, getDistributionsAmount }: CreateAccountParams) {
  const createAccount = useCreateAccount();

  const handleCreateAccount = async () => {
    try {
      await createAccount.mutateAsync(buildAccountData());
      const label = getFiscalYearLabel();
      notifyAllBeneficiaries(
        'تحديث الحسابات الختامية',
        `تم تحديث الحسابات الختامية للسنة المالية ${label}`,
        'info', '/beneficiary/accounts',
      );
      if (getDistributionsAmount() > 0) {
        notifyAllBeneficiaries(
          'تحديث التوزيعات المالية',
          `تم تحديث توزيعات الأرباح للسنة المالية ${label}. يرجى مراجعة حصتك`,
          'info', '/beneficiary/my-share',
        );
      }
    } catch (err) {
      logger.error('خطأ في حفظ الحسابات:', err instanceof Error ? err.message : err);
      defaultNotify.error('خطأ في حفظ الحسابات');
    }
  };

  return { handleCreateAccount, createAccountPending: createAccount.isPending };
}
