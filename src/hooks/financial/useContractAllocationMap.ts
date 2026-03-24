/**
 * Hook مشترك لبناء خريطة تخصيص العقود للسنوات المالية
 * يُستخدم في أي مكان يحتاج allocationMap بدون تكرار المنطق
 */
import { useMemo } from 'react';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { allocateContractToFiscalYears } from '@/utils/contractAllocation';

interface ContractLike {
  id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  payment_type?: string;
  payment_count?: number;
  payment_amount?: number | null;
}

export function useContractAllocationMap(contracts: ContractLike[]) {
  const { fiscalYearId, fiscalYears } = useFiscalYear();

  const allocationMap = useMemo(() => {
    const map = new Map<string, { allocated_payments: number; allocated_amount: number }>();
    if (!fiscalYearId || fiscalYearId === 'all' || fiscalYears.length === 0) return map;
    for (const c of contracts) {
      const allocs = allocateContractToFiscalYears(
        {
          id: c.id,
          start_date: c.start_date,
          end_date: c.end_date,
          rent_amount: Number(c.rent_amount),
          payment_type: c.payment_type || 'annual',
          payment_count: c.payment_count || 1,
          payment_amount: c.payment_amount != null ? Number(c.payment_amount) : undefined,
        },
        fiscalYears
      );
      const match = allocs.find(a => a.fiscal_year_id === fiscalYearId);
      if (match) {
        map.set(c.id, { allocated_payments: match.allocated_payments, allocated_amount: match.allocated_amount });
      }
    }
    return map;
  }, [contracts, fiscalYearId, fiscalYears]);

  return allocationMap;
}
