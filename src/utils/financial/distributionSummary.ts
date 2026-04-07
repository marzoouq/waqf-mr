/**
 * دوال مشتركة لتصفية وتلخيص التوزيعات
 * مستخرجة من useMySharePage و useDisclosurePage
 */
import { safeNumber } from '@/utils/format/safeNumber';

interface DistributionLike {
  status: string;
  amount: number;
  fiscal_year_id?: string;
}

/** تصفية التوزيعات حسب وجود حساب أو سنة مالية */
export function filterDistributionsByFiscalYear<T extends DistributionLike>(
  distributions: T[],
  hasAccount: boolean,
  fiscalYearId?: string | null,
): T[] {
  if (hasAccount) return distributions;
  if (fiscalYearId && fiscalYearId !== 'all') {
    return distributions.filter(d => d.fiscal_year_id === fiscalYearId);
  }
  return distributions;
}

/** تلخيص المبالغ المدفوعة والمعلقة */
export function summarizeDistributions(distributions: DistributionLike[]) {
  let totalReceived = 0;
  let pendingAmount = 0;
  for (const d of distributions) {
    const amt = safeNumber(d.amount);
    if (d.status === 'paid') totalReceived += amt;
    else if (d.status === 'pending') pendingAmount += amt;
  }
  return { totalReceived, pendingAmount };
}
