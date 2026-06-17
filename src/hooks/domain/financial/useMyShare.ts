import { useMemo } from 'react';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useTotalBeneficiaryPercentage } from '@/hooks/data/financial/dashboard/useTotalBeneficiaryPercentage';
import { safeNumber } from '@/utils/format/safeNumber';
import { calculateDistributions } from '@/utils/financial/distribution/distributionCalcPure';

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
 *
 * D3 fix: مسار الـ fallback يستخدم LRM (calculateDistributions) — نفس
 * خوارزمية execute_distribution SQL — لضمان تطابق القرش-بالقرش مع الخادم
 * وعدم إخفاء أي عجز أو فروق ناتجة عن التقريب التناسبي البسيط.
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
    // #9: تفضيل القيمة المحسوبة من الخادم (RPC) عند توفرها — بما فيها 0 الصريحة (عجز/مرحّل كامل).
    // إصلاح H-01: حماية ضد القيم السالبة في كلا المسارين (server + fallback)
    if (serverMyShare !== null && serverMyShare !== undefined && isFinite(serverMyShare)) {
      return Math.max(0, serverMyShare);
    }
    // D3 fallback: حساب محلي بـ LRM لمطابقة execute_distribution SQL.
    const avail = safeNumber(availableAmount);
    if (!currentBeneficiary || totalBenPct <= 0 || avail <= 0) return 0;

    // بناء قائمة ذات id/name/share_percentage مستقرّة للـ LRM
    const benForLrm = beneficiaries.map((b, idx) => ({
      id: (b as { id?: string }).id ?? b.user_id ?? `idx-${idx}`,
      name: String((b as { name?: string }).name ?? b.user_id ?? idx),
      share_percentage: safeNumber(b.share_percentage),
      user_id: b.user_id ?? null,
    }));
    const sumPct = benForLrm.reduce((s, b) => s + b.share_percentage, 0);
    if (sumPct <= 0) return 0;

    // إذا كان totalBenPct (الموثوق من الخادم) != sumPct (القائمة الممرّرة)،
    // نُطبّق عامل تصحيح على المبلغ المتاح لاحترام المقام الموثوق دون كسر LRM.
    const effectiveAvailable = avail * (sumPct / totalBenPct);
    const rows = calculateDistributions(benForLrm, effectiveAvailable);
    const myId = (currentBeneficiary as { id?: string }).id;
    const myRow = rows.find(r =>
      myId ? r.beneficiary_id === myId : r.beneficiary_user_id === currentBeneficiary.user_id,
    );
    return Math.max(0, myRow?.share_amount ?? 0);
  }, [serverMyShare, currentBeneficiary, beneficiaries, availableAmount, totalBenPct]);

  return { currentBeneficiary, totalBenPct, pctLoading, myShare };
};
