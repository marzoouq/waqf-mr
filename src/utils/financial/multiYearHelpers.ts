/**
 * دوال مساعدة لتحويل بيانات الملخص متعدد السنوات
 * مُستخرجة من useMultiYearSummary لسهولة الاختبار
 */
import type { YearSummaryEntry } from '@/types/financial/multiYear';

export interface RpcYearEntry {
  year_id: string;
  label: string;
  status: string;
  total_income: number;
  total_expenses: number;
  account: {
    vat_amount: number;
    zakat_amount: number;
    admin_share: number;
    waqif_share: number;
    waqf_revenue: number;
    net_after_expenses: number;
    net_after_vat: number;
    /** snapshot من RPC v2 — قد يكون غير موجود في الكاش القديم */
    net_after_zakat?: number;
    /** snapshot من RPC v2 — قد يكون غير موجود في الكاش القديم */
    available_amount?: number;
    distributions_amount: number;
    waqf_corpus_manual: number;
    waqf_corpus_previous: number;
  } | null;
  expenses_by_type: Array<{ expense_type: string; total: number }>;
}

/** تحويل صف RPC خام إلى YearSummaryEntry */
export function mapEntry(raw: RpcYearEntry): YearSummaryEntry {
  const acct = raw.account;
  const hasSnapshot = acct !== null;
  const waqfRevenue = acct?.waqf_revenue ?? 0;
  const corpusManual = acct?.waqf_corpus_manual ?? 0;
  const netAfterVat = acct?.net_after_vat ?? 0;
  const zakatAmount = acct?.zakat_amount ?? 0;
  const expensesByType: Record<string, number> = {};
  (raw.expenses_by_type ?? []).forEach(e => {
    expensesByType[e.expense_type] = e.total;
  });

  // net_after_zakat: من snapshot إن وُجدت (يحفظ القيمة وقت الإقفال)، fallback لحساب فوري.
  const netAfterZakat = acct?.net_after_zakat ?? (netAfterVat - zakatAmount);
  // available_amount الخام: من snapshot إن وُجدت، fallback لحساب فوري.
  const rawAvailable = acct?.available_amount ?? (waqfRevenue - corpusManual);

  return {
    yearId: raw.year_id,
    label: raw.label,
    status: raw.status,
    totalIncome: raw.total_income,
    totalExpenses: raw.total_expenses,
    vatAmount: acct?.vat_amount ?? 0,
    zakatAmount,
    adminShare: acct?.admin_share ?? 0,
    waqifShare: acct?.waqif_share ?? 0,
    waqfRevenue,
    netAfterExpenses: acct?.net_after_expenses ?? 0,
    netAfterVat,
    netAfterZakat,
    // P1-6 (السياسة ب): حماية بصرية + إعلان isDeficit للـ badge
    availableAmount: Math.max(0, rawAvailable),
    rawAvailableAmount: rawAvailable,
    distributionsAmount: acct?.distributions_amount ?? 0,
    expensesByType,
    isDeficit: rawAvailable < 0,
    hasSnapshot,
  };
}
