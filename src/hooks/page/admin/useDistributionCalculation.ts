/**
 * هوك حسابات التوزيع على المستفيدين
 */
import { useMemo } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { usePaidAdvances, useActiveCarryforwards } from '@/hooks/data/financial/useDistributionAdvances';
import { calculateDistributions } from './distributionCalcPure';

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
  const { data: paidAdvances = [] } = usePaidAdvances(fiscalYearId, open);
  const { data: activeCarryforwards = [] } = useActiveCarryforwards(fiscalYearId, open);

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

  const distributions = useMemo(
    () => calculateDistributions(beneficiaries, availableAmount, advancesByBeneficiary, carryforwardByBeneficiary),
    [beneficiaries, availableAmount, advancesByBeneficiary, carryforwardByBeneficiary],
  );

  const totalNet = distributions.reduce((s, d) => s + d.net_amount, 0);
  const totalAdvances = distributions.reduce((s, d) => s + d.advances_paid, 0);
  const totalCarryforward = distributions.reduce((s, d) => s + d.carryforward_deducted, 0);
  const totalDeficit = distributions.reduce((s, d) => s + d.deficit, 0);
  const hasDeficit = totalDeficit > 0;

  return { distributions, totalNet, totalAdvances, totalCarryforward, totalDeficit, hasDeficit };
}
