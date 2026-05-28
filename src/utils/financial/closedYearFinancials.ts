/**
 * حساب المؤشرات المالية لسنة مقفلة — يقرأ القيم المخزنة في الحساب الختامي
 *
 * P1-1: يُفضِّل `account.net_after_zakat` المخزَّن (إن وُجد) على إعادة الحساب محلياً
 *       لضمان مصدر حقيقة واحد بين كل الصفحات (AdminDashboard / Reports / Accounts).
 * P1-6 (السياسة ب): حماية بصرية — Math.max(0) على المبالغ القابلة للعرض،
 *       مع إعلان `isDeficit` كي تعرض الواجهة Alert منفصلاً عند العجز.
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

  // P1-1: تفضيل القيمة المخزَّنة في DB كمصدر واحد للحقيقة
  const storedNetAfterZakat =
    (account as { net_after_zakat?: number | null }).net_after_zakat != null
      ? safeNumber((account as { net_after_zakat?: number | null }).net_after_zakat)
      : storedNetAfterVat - storedZakat;

  const grandTotal = storedTotalIncome + waqfCorpusPrevious;
  const shareBase = Math.max(0, storedTotalIncome - storedTotalExpenses - storedZakat);
  // P1-6: العجز يُحفَظ كقيمة فعلية للحساب لكن العرض يتم بحد أدنى 0
  const rawAvailable = storedWaqfRevenue - waqfCorpusManual;
  const rawRemaining = rawAvailable - distributionsAmount;
  const availableAmount = Math.max(0, rawAvailable);
  const remainingBalance = Math.max(0, rawRemaining);

  return {
    grandTotal,
    netAfterExpenses: safeNumber(account.net_after_expenses),
    netAfterVat: storedNetAfterVat,
    netAfterZakat: storedNetAfterZakat,
    shareBase,
    adminShare: storedAdminShare,
    waqifShare: storedWaqifShare,
    waqfRevenue: storedWaqfRevenue,
    availableAmount,
    remainingBalance,
    isDeficit: rawAvailable < 0 || rawRemaining < 0,
  };
}
