/**
 * مُصدِّر PDF للحسابات الختامية — مفصول من useAccountsActions لاحترام حدود الحجم.
 */
import { uiNotify } from '@/lib/notify';
import type { AccountsActionsParams } from '@/types/financial/accountsActions';

export async function exportAccountsPdf(p: AccountsActionsParams): Promise<void> {
  try {
    const { generateAccountsPDF } = await import('@/utils/pdf');
    await generateAccountsPDF({
      contracts: p.contracts,
      incomeBySource: p.incomeBySource,
      expensesByType: p.expensesByType,
      totalIncome: p.totalIncome,
      totalExpenses: p.totalExpenses,
      netRevenue: p.netAfterZakat,
      adminShare: p.adminShare,
      waqifShare: p.waqifShare,
      waqfRevenue: p.waqfRevenue,
      beneficiaries: p.beneficiaries,
      vatAmount: p.manualVat,
      distributionsAmount: p.manualDistributions,
      waqfCorpusManual: p.waqfCorpusManual,
      zakatAmount: p.zakatAmount,
      netAfterZakat: p.netAfterZakat,
      waqfCorpusPrevious: p.waqfCorpusPrevious,
      grandTotal: p.grandTotal,
      availableAmount: p.availableAmount,
      remainingBalance: p.remainingBalance,
      fiscalYearStartDate: p.fiscalYearStartDate ?? null,
      overdueFromPreviousAmount: p.overdueFromPreviousAmount ?? 0,
      overdueInYearAmount: p.overdueInYearAmount ?? 0,
    });
    uiNotify.success('تم تصدير التقرير بنجاح');
  } catch {
    uiNotify.error('حدث خطأ أثناء تصدير التقرير');
  }
}

export function buildAccountData(p: AccountsActionsParams) {
  return {
    fiscal_year: p.selectedFY?.label || p.fiscalYear,
    fiscal_year_id: p.selectedFY?.id || '',
    total_income: p.totalIncome,
    total_expenses: p.totalExpenses,
    admin_share: p.adminShare,
    waqif_share: p.waqifShare,
    waqf_revenue: p.waqfRevenue,
    vat_amount: p.manualVat,
    distributions_amount: p.manualDistributions,
    net_after_expenses: p.netAfterExpenses,
    net_after_vat: p.netAfterVat,
    zakat_amount: p.zakatAmount,
    waqf_corpus_manual: p.waqfCorpusManual,
    waqf_corpus_previous: p.waqfCorpusPrevious,
  };
}
