/**
 * Pure financial calculation functions used across AccountsPage, AdminDashboard, and ReportsPage.
 * Follows the financial hierarchy: Income → Expenses → VAT → Zakat → Shares → Revenue → Distributions
 */

import { Income, Expense } from '@/types/database';

export interface FinancialParams {
  totalIncome: number;
  totalExpenses: number;
  waqfCorpusPrevious: number;
  manualVat: number;
  zakatAmount: number;
  adminPercent: number;
  waqifPercent: number;
  waqfCorpusManual: number;
  manualDistributions: number;
  /** When false (active year), shares and corpus are zeroed out */
  isClosed?: boolean;
}

export interface FinancialResult {
  grandTotal: number;
  netAfterExpenses: number;
  netAfterVat: number;
  netAfterZakat: number;
  shareBase: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  availableAmount: number;
  remainingBalance: number;
}

/**
 * Core financial hierarchy calculation.
 *
 * **F1/F9 — by design (Islamic Waqf accounting):**
 * - `shareBase` = totalIncome − totalExpenses − zakatAmount
 *   → حصة الناظر والواقف تُحسب من الدخل فقط بعد خصم المصروفات والزكاة
 *   → الضريبة (VAT) لا تُخصم من أساس الحصص لأنها ليست مصروفاً تشغيلياً
 * - `waqfCorpusPrevious` يُضاف إلى `grandTotal` لكن لا يدخل في `shareBase`
 *   → رقبة الوقف المرحّلة رأس مال أصيل يذهب كاملاً لريع الوقف
 * - `waqfRevenue` = netAfterZakat − adminShare − waqifShare
 *   → يشمل تلقائياً وفر الضريبة ورقبة الوقف المرحّلة
 *
 * **توزيع حصص المستفيدين:**
 * ```
 * إجمالي الدخل + رقبة الوقف المرحّلة
 *   − المصروفات
 *   − الضريبة (VAT)
 *   − الزكاة
 *   − حصة الناظر (10% من shareBase)
 *   − حصة الواقف (5% من shareBase)
 *   = ريع الوقف (waqfRevenue)
 *   − رقبة الوقف اليدوية
 *   = المبلغ المتاح للتوزيع (availableAmount)
 * ```
 * لا توجد نسبة ثابتة للمستفيدين — الدخل قد يُستهلك بالكامل كمصروفات.
 * المبلغ المتاح يُوزَّع تناسبياً: حصة المستفيد = availableAmount × (نسبته / مجموع النسب).
 */
export const calculateFinancials = (params: FinancialParams): FinancialResult => {
  const {
    totalIncome, totalExpenses, waqfCorpusPrevious, manualVat,
    zakatAmount, adminPercent, waqifPercent, waqfCorpusManual, manualDistributions,
    isClosed = true,
  } = params;

  const grandTotal = totalIncome + waqfCorpusPrevious;
  const netAfterExpenses = grandTotal - totalExpenses;
  const netAfterVat = netAfterExpenses - manualVat;
  const netAfterZakat = netAfterVat - zakatAmount;
  const shareBase = Math.max(0, totalIncome - totalExpenses - zakatAmount);

  // Shares and corpus only apply after fiscal year closure
  if (!isClosed) {
    return {
      grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
      shareBase,
      adminShare: 0,
      waqifShare: 0,
      waqfRevenue: 0,
      availableAmount: 0,
      remainingBalance: 0,
    };
  }

  const adminShare = Math.round(shareBase * (adminPercent / 100) * 100) / 100;
  const waqifShare = Math.round(shareBase * (waqifPercent / 100) * 100) / 100;
  const waqfRevenue = Math.round((netAfterZakat - adminShare - waqifShare) * 100) / 100;
  const availableAmount = Math.round((waqfRevenue - waqfCorpusManual) * 100) / 100;
  const remainingBalance = Math.round((availableAmount - manualDistributions) * 100) / 100;

  return {
    grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    shareBase, adminShare, waqifShare, waqfRevenue,
    availableAmount, remainingBalance,
  };
};

/** Group income records by source */
export const groupIncomeBySource = (income: Income[]): Record<string, number> => {
  return income.reduce((acc, item) => {
    const source = item.source || 'غير محدد';
    acc[source] = (acc[source] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);
};

/** Group expense records by type */
export const groupExpensesByType = (expenses: Expense[]): Record<string, number> => {
  return expenses.reduce((acc, item) => {
    const type = item.expense_type || 'غير محدد';
    acc[type] = (acc[type] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);
};

/** Compute totals from raw records */
export const computeTotals = (income: Income[], expenses: Expense[]) => ({
  totalIncome: income.reduce((sum, item) => sum + Number(item.amount), 0),
  totalExpenses: expenses.reduce((sum, item) => sum + Number(item.amount), 0),
});
