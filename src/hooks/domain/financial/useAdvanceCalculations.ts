/**
 * طبقة domain: حسابات السلف والمرحّلات (مجاميع، أرصدة فعلية).
 * يعتمد على طبقة data: `useMyBeneficiaryFinanceRaw`.
 */
import { useMemo } from 'react';
import { useMyBeneficiaryFinanceRaw } from '@/hooks/data/financial/advances/useAdvanceQueries';
import { safeNumber } from '@/utils/format/safeNumber';
import type { AdvanceRequest, AdvanceCarryforward } from '@/types/advance';

export interface BeneficiaryFinanceComputed {
  myAdvances: AdvanceRequest[];
  myCarryforwards: AdvanceCarryforward[];
  paidAdvancesTotal: number;
  carryforwardBalance: number;
}

export const useMyBeneficiaryFinance = (beneficiaryId?: string, fiscalYearId?: string) => {
  const query = useMyBeneficiaryFinanceRaw(beneficiaryId);

  const data = useMemo<BeneficiaryFinanceComputed>(() => {
    const raw = query.data ?? { advances: [], carryforwards: [] };
    const paidAdvancesTotal = raw.advances
      .filter(a => a.status === 'paid' && (!fiscalYearId || a.fiscal_year_id === fiscalYearId))
      .reduce((sum, a) => sum + safeNumber(a.amount), 0);

    const carryforwardBalance = raw.carryforwards
      .filter(c => c.status === 'active' && (!fiscalYearId || c.to_fiscal_year_id === fiscalYearId || !c.to_fiscal_year_id))
      .reduce((sum, c) => sum + safeNumber(c.amount), 0);

    return {
      myAdvances: raw.advances,
      myCarryforwards: raw.carryforwards,
      paidAdvancesTotal,
      carryforwardBalance,
    };
  }, [query.data, fiscalYearId]);

  return { ...query, data };
};
