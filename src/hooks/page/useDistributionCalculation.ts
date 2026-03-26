/**
 * هوك حسابات التوزيع على المستفيدين
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeNumber } from '@/utils/safeNumber';

interface Beneficiary {
  id: string;
  name: string;
  share_percentage: number;
  user_id?: string | null;
}

export function useDistributionCalculation(
  beneficiaries: Beneficiary[],
  availableAmount: number,
  fiscalYearId: string | undefined,
  open: boolean,
) {
  // جلب السُلف المصروفة لكل مستفيد في هذه السنة
  const { data: paidAdvances = [] } = useQuery({
    queryKey: ['advance_requests', 'paid_all', fiscalYearId],
    queryFn: async () => {
      let query = supabase
        .from('advance_requests')
        .select('beneficiary_id, amount')
        .eq('status', 'paid');
      if (fiscalYearId) query = query.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as { beneficiary_id: string; amount: number }[];
    },
    enabled: open,
  });

  // جلب الفروق المرحّلة النشطة
  const { data: activeCarryforwards = [] } = useQuery({
    queryKey: ['advance_carryforward', 'active_for_distribution', fiscalYearId],
    queryFn: async () => {
      let query = supabase
        .from('advance_carryforward')
        .select('beneficiary_id, amount')
        .eq('status', 'active');
      if (fiscalYearId) {
        query = query.or(`to_fiscal_year_id.eq.${fiscalYearId},to_fiscal_year_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as { beneficiary_id: string; amount: number }[];
    },
    enabled: open,
  });

  const advancesByBeneficiary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const adv of paidAdvances) {
      map[adv.beneficiary_id] = (map[adv.beneficiary_id] || 0) + safeNumber(adv.amount);
    }
    return map;
  }, [paidAdvances]);

  const carryforwardByBeneficiary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cf of activeCarryforwards) {
      map[cf.beneficiary_id] = (map[cf.beneficiary_id] || 0) + safeNumber(cf.amount);
    }
    return map;
  }, [activeCarryforwards]);

  const distributions = useMemo(() => {
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
  }, [beneficiaries, availableAmount, advancesByBeneficiary, carryforwardByBeneficiary]);

  const totalNet = distributions.reduce((s, d) => s + d.net_amount, 0);
  const totalAdvances = distributions.reduce((s, d) => s + d.advances_paid, 0);
  const totalCarryforward = distributions.reduce((s, d) => s + d.carryforward_deducted, 0);
  const totalDeficit = distributions.reduce((s, d) => s + d.deficit, 0);
  const hasDeficit = totalDeficit > 0;

  return { distributions, totalNet, totalAdvances, totalCarryforward, totalDeficit, hasDeficit };
}
