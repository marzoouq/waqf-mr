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
  /** الصافي بعد الزكاة (net_after_vat - zakat_amount) — يُستخدم كعمود منفصل في المقارنات */
  netAfterZakat: number;
  availableAmount: number;
  /** المتاح الخام قبل حماية Math.max(0) — يُستخدم لعرض العجز السالب في الجداول التحليلية */
  rawAvailableAmount: number;
  distributionsAmount: number;
  expensesByType: Record<string, number>;
  /** علم العجز — يظهر badge "عجز" في الواجهة */
  isDeficit?: boolean;
  /** هل توجد snapshot لهذه السنة (للتمييز عن السنوات النشطة) */
  hasSnapshot?: boolean;
}
