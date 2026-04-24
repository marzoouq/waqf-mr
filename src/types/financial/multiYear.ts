/**
 * أنواع الملخص المالي متعدد السنوات
 *
 * مُستخرَج من `hooks/data/financial/useMultiYearSummary` لمنع تبعية
 * طبقة `utils/` على طبقة `hooks/` (انتهاك معماري).
 */

/** شكل البيانات لكل سنة — متوافق مع واجهة useFinancialSummary */
export interface YearSummaryEntry {
  yearId: string;
  label: string;
  status: string;
  totalIncome: number;
  totalExpenses: number;
  vatAmount: number;
  zakatAmount: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  netAfterExpenses: number;
  netAfterVat: number;
  availableAmount: number;
  distributionsAmount: number;
  expensesByType: Record<string, number>;
}
