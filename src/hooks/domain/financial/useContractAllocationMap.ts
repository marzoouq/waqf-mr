/**
 * Hook مشترك لبناء خريطة تخصيص العقود للسنة المالية المختارة.
 *
 * مصدر الحقيقة الوحيد: جدول `contract_fiscal_allocations` (DB).
 * مطابق لمنطق دالة RPC `get_dashboard_full_summary` — لا يستخدم
 * أي fallback خطي محلي. العقود التي لا تملك تخصيصاً مخزّناً في DB
 * لن تظهر في الخريطة (يستهلكها المستهلك بقيمة fallback عند الحاجة عبر
 * `computeContractualRevenue` أو `safeNumber(c.rent_amount)`).
 *
 * @param _contracts قائمة العقود (تُمرَّر لأغراض توافق API فقط، غير مستخدمة داخلياً)
 */
import { useMemo } from 'react';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractAllocations } from '@/hooks/data/financial/contracts/useContractAllocations';
import { isFyAll } from '@/constants/fiscalYearIds';

interface ContractLike {
  id: string | null;
}

export function useContractAllocationMap(_contracts: ContractLike[]) {
  const { fiscalYearId } = useFiscalYear();
  const isSpecific = fiscalYearId && !isFyAll(fiscalYearId);
  const { data: allocations = [] } = useContractAllocations(
    isSpecific ? fiscalYearId : undefined
  );

  return useMemo(() => {
    const map = new Map<string, { allocated_payments: number; allocated_amount: number }>();
    if (!isSpecific) return map;
    for (const a of allocations) {
      if (!a.contract_id) continue;
      map.set(a.contract_id, {
        allocated_payments: a.allocated_payments,
        allocated_amount: a.allocated_amount,
      });
    }
    return map;
  }, [allocations, isSpecific]);
}
