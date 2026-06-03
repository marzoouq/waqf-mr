import { useMemo } from 'react';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useTotalBeneficiaryPercentage } from '@/hooks/data/financial/dashboard/useTotalBeneficiaryPercentage';
import { safeNumber } from '@/utils/format/safeNumber';

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
    // #9: تفضيل القيمة المحسوبة من الخادم (RPC) عند توفرها — بما فيها 0 الصريحة من DB المغلقة.
    // ملاحظة: بعد إصلاح RPC `get_beneficiary_dashboard` (يونيو 2026) أصبحت السنة النشطة
    // تُرجع تقديراً حقيقياً بدل 0، فلم يعد 0 يعني "غير محسوب" إلا للسنوات بدون snapshot حساب.
    if (serverMyShare !== null && serverMyShare !== undefined && isFinite(serverMyShare) && serverMyShare > 0) {
      return serverMyShare;
    }
    // fallback: حساب محلي (للناظر، أو عند غياب snapshot الحساب، أو عند serverMyShare=0)
    if (!currentBeneficiary || totalBenPct <= 0) return safeNumber(serverMyShare);
    const localShare = Math.round(safeNumber(availableAmount) * safeNumber(currentBeneficiary.share_percentage) / totalBenPct * 100) / 100;
    // إذا الـ fallback المحلي = 0 أيضاً، نُرجع قيمة الخادم (قد تكون 0 صراحة لسنة مغلقة بلا متاح)
    return localShare > 0 ? localShare : safeNumber(serverMyShare);
  }, [serverMyShare, currentBeneficiary, availableAmount, totalBenPct]);

  return { currentBeneficiary, totalBenPct, pctLoading, myShare };
};
