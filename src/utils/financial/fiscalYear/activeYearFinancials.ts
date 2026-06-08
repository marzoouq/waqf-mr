/**
 * حساب المؤشرات المالية لسنة نشطة (مفتوحة) مع حساب ختامي موجود
 * الحصص تُصفّر لأن السنة لم تُقفل بعد
 */
import type { ActiveYearParams, FinancialResult } from '@/types/financial';

export type { ActiveYearParams };

export function activeYearFinancials(params: ActiveYearParams): FinancialResult {
  const { totalIncome, totalExpenses, waqfCorpusPrevious, vatAmount, zakatAmount } = params;

  const grandTotal = totalIncome + waqfCorpusPrevious;
  const netAfterExpenses = grandTotal - totalExpenses;
  const netAfterVat = netAfterExpenses - vatAmount;
  const netAfterZakat = netAfterVat - zakatAmount;
  const shareBase = Math.max(0, totalIncome - totalExpenses - zakatAmount);

  return {
    grandTotal,
    netAfterExpenses,
    netAfterVat,
    netAfterZakat,
    shareBase,
    adminShare: 0,
    waqifShare: 0,
    waqfRevenue: 0,
    availableAmount: 0,
    remainingBalance: 0,
    isDeficit: false,
  };
}
