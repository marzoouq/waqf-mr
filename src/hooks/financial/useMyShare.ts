import { useMemo } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useTotalBeneficiaryPercentage } from './useTotalBeneficiaryPercentage';
import { safeNumber } from '@/utils/safeNumber';

interface BeneficiaryLike {
  user_id?: string | null;
  share_percentage?: number | null;
  [key: string]: unknown;
}

interface UseMyShareParams {
  /** قائمة المستفيدين (عادةً من useBeneficiariesSafe) */
  beneficiaries: BeneficiaryLike[];
  /** المبلغ القابل للتوزيع على المستفيدين */
  availableAmount: number;
  /**
   * القيمة المحسوبة من الخادم (RPC) — عند تقديمها تُستخدم كمصدر موثوق
   * بدلاً من الحساب المحلي لضمان اتساق الأرقام مع لوحة التحكم.
   * إصلاح #9: توحيد مصدر my_share
   */
  serverMyShare?: number | null;
}

/**
 * هوك موحّد لحساب حصة المستفيد الحالي من الريع.
 * يُفضّل القيمة المحسوبة من الخادم (serverMyShare) عند توفرها
 * لضمان اتساق الأرقام مع RPC get_beneficiary_dashboard.
 * يعود للحساب المحلي كـ fallback (مثلاً عند معاينة الناظر).
 */
export const useMyShare = <T extends BeneficiaryLike>({
  beneficiaries,
  availableAmount,
  serverMyShare,
}: UseMyShareParams & { beneficiaries: T[] }) => {
  const { user } = useAuth();
  const { data: totalBenPct = 0, isLoading: pctLoading } = useTotalBeneficiaryPercentage();

  const currentBeneficiary = useMemo(
    () => beneficiaries.find(b => b.user_id === user?.id) as T | undefined,
    [beneficiaries, user?.id],
  );

  const myShare = useMemo(() => {
    // #9: تفضيل القيمة المحسوبة من الخادم (RPC) عند توفرها
    if (serverMyShare != null && isFinite(serverMyShare)) {
      return serverMyShare;
    }
    // fallback: حساب محلي (للناظر أو عند غياب RPC)
    if (!currentBeneficiary || totalBenPct <= 0) return 0;
    return Math.round(safeNumber(availableAmount) * safeNumber(currentBeneficiary.share_percentage) / totalBenPct * 100) / 100;
  }, [serverMyShare, currentBeneficiary, availableAmount, totalBenPct]);

  return { currentBeneficiary, totalBenPct, pctLoading, myShare };
};
