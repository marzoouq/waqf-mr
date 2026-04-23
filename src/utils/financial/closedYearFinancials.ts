/**
 * حساب المؤشرات المالية لسنة مقفلة — يقرأ القيم المخزنة في الحساب الختامي
 */
import { safeNumber } from '@/utils/format/safeNumber';
import type { ClosedYearParams, FinancialResult } from '@/types/financial';

export type { ClosedYearParams };

export function closedYearFinancials(params: ClosedYearParams): FinancialResult {
  const { account, waqfCorpusPrevious, waqfCorpusManual, distributionsAmount } = params;

  const storedTotalIncome = safeNumber(account.total_income);
  const storedTotalExpenses = safeNumber(account.total_expenses);
  const storedNetAfterVat = safeNumber(account.net_after_vat);
  const storedZakat = safeNumber(account.zakat_amount);
  const storedAdminShare = safeNumber(account.admin_share);
  const storedWaqifShare = safeNumber(account.waqif_share);
  const storedWaqfRevenue = safeNumber(account.waqf_revenue);

  const grandTotal = storedTotalIncome + waqfCorpusPrevious;
  const shareBase = Math.max(0, storedTotalIncome - storedTotalExpenses - storedZakat);
  const availableAmount = storedWaqfRevenue - waqfCorpusManual;
  const remainingBalance = availableAmount - distributionsAmount;

  return {
    grandTotal,
    netAfterExpenses: safeNumber(account.net_after_expenses),
    netAfterVat: storedNetAfterVat,
    netAfterZakat: storedNetAfterVat - storedZakat,
    shareBase,
    adminShare: storedAdminShare,
    waqifShare: storedWaqifShare,
    waqfRevenue: storedWaqfRevenue,
    availableAmount,
    remainingBalance,
    isDeficit: availableAmount < 0 || remainingBalance < 0,
  };
}
