/**
 * حساب الإيرادات التعاقدية لسنة مالية محددة.
 *
 * مطابق لمنطق دالة `get_dashboard_full_summary` في قاعدة البيانات:
 *  - الأولوية 1: مجموع `allocated_amount` من `contract_fiscal_allocations` لهذه السنة.
 *  - الأولوية 2 (Fallback): مجموع `rent_amount` للعقود حيث `fiscal_year_id = v_fy_id` فقط.
 *
 * لا يُخلط بين السنوات أبداً — أي عقد لا ينتمي للسنة المختارة لا يُحتسب.
 */
import { safeNumber } from '@/utils/format/safeNumber';

interface ContractLike {
  id?: string | null;
  rent_amount?: number | string | null;
  fiscal_year_id?: string | null;
}

interface AllocationLike {
  contract_id?: string | null;
  fiscal_year_id?: string | null;
  allocated_amount?: number | string | null;
}

/**
 * @param contracts عقود مرشّحة مسبقاً للسنة المختارة فقط
 * @param allocations مخصصات السنة المختارة فقط
 */
export function computeContractualRevenue(
  contracts: ContractLike[],
  allocations: AllocationLike[],
): number {
  const allocSum = allocations.reduce((s, a) => s + safeNumber(a.allocated_amount), 0);
  if (allocSum > 0) return allocSum;
  return contracts.reduce((s, c) => s + safeNumber(c.rent_amount), 0);
}
