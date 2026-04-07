/**
 * منطق حساب التوزيع الصافي — دوال نقية قابلة للاختبار
 * تُستخدم من useDistributionCalculation
 */
import { safeNumber } from '@/utils/format/safeNumber';

interface Beneficiary {
  id: string;
  name: string;
  share_percentage: number;
  user_id?: string | null;
}

export interface DistributionRow {
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_user_id?: string | null;
  share_percentage: number;
  share_amount: number;
  advances_paid: number;
  carryforward_deducted: number;
  net_amount: number;
  deficit: number;
}

/**
 * خوارزمية توزيع الحصص بطريقة الباقي الأكبر (Largest Remainder Method)
 * تضمن أن مجموع الحصص = المبلغ المتاح بالضبط
 */
export function calculateDistributions(
  beneficiaries: Beneficiary[],
  availableAmount: number,
  advancesByBeneficiary: Record<string, number> = {},
  carryforwardByBeneficiary: Record<string, number> = {},
): DistributionRow[] {
  const totalPercentage = beneficiaries.reduce((s, b) => s + safeNumber(b.share_percentage), 0);

  if (totalPercentage === 0 || availableAmount === 0) {
    return beneficiaries.map(b => ({
      beneficiary_id: b.id, beneficiary_name: b.name, beneficiary_user_id: b.user_id,
      share_percentage: b.share_percentage, share_amount: 0, advances_paid: 0,
      carryforward_deducted: 0, net_amount: 0, deficit: 0,
    }));
  }

  const rawShares = beneficiaries.map(b => {
    const exact = availableAmount * safeNumber(b.share_percentage) / totalPercentage;
    const floored = Math.floor(exact * 100) / 100;
    return { id: b.id, exact, floored, remainder: exact - floored };
  });

  const totalFloored = rawShares.reduce((s, r) => s + r.floored, 0);
  let remainingPennies = Math.round((availableAmount - totalFloored) * 100);
  const sorted = [...rawShares].sort((a, b) => b.remainder - a.remainder);
  const adjustments: Record<string, number> = {};
  for (const item of sorted) {
    if (remainingPennies <= 0) break;
    adjustments[item.id] = 0.01;
    remainingPennies--;
  }

  return beneficiaries.map(b => {
    const raw = rawShares.find(r => r.id === b.id)!;
    const shareAmount = raw.floored + (adjustments[b.id] || 0);
    const advances = advancesByBeneficiary[b.id] || 0;
    const carryforward = carryforwardByBeneficiary[b.id] || 0;
    const totalDeductions = advances + carryforward;
    const rawNet = shareAmount - totalDeductions;
    const net = Math.max(0, Math.round(rawNet * 100) / 100);
    const deficit = rawNet < 0 ? Math.round(Math.abs(rawNet) * 100) / 100 : 0;
    const afterAdvances = Math.max(0, shareAmount - advances);
    const actualCarryforward = Math.min(carryforward, afterAdvances);

    return {
      beneficiary_id: b.id, beneficiary_name: b.name, beneficiary_user_id: b.user_id,
      share_percentage: b.share_percentage, share_amount: shareAmount,
      advances_paid: advances,
      carryforward_deducted: Math.round(actualCarryforward * 100) / 100,
      net_amount: net, deficit,
    };
  });
}
