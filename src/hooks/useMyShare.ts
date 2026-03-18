import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
}

/**
 * هوك موحّد لحساب حصة المستفيد الحالي من الريع.
 * يستخدم `safeNumber` على كل من `availableAmount` و `share_percentage`
 * لمنع أخطاء NaN الصامتة.
 */
export const useMyShare = <T extends BeneficiaryLike>({
  beneficiaries,
  availableAmount,
}: UseMyShareParams & { beneficiaries: T[] }) => {
  const { user } = useAuth();
  const { data: totalBenPct = 0, isLoading: pctLoading } = useTotalBeneficiaryPercentage();

  const currentBeneficiary = useMemo(
    () => beneficiaries.find(b => b.user_id === user?.id) as T | undefined,
    [beneficiaries, user?.id],
  );

  const myShare = useMemo(() => {
    if (!currentBeneficiary || totalBenPct <= 0) return 0;
    return Math.round(safeNumber(availableAmount) * safeNumber(currentBeneficiary.share_percentage) / totalBenPct * 100) / 100;
  }, [currentBeneficiary, availableAmount, totalBenPct]);

  return { currentBeneficiary, totalBenPct, pctLoading, myShare };
};
