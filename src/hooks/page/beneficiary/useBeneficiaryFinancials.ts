/**
 * هوك مشترك لاستخراج البيانات المالية من RPC المستفيد
 * يُوحّد الكود المُكرر في useMySharePage, useAccountsViewPage, useDisclosurePage, useFinancialReportsPage
 */
import { useMemo } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { toSourceRecord, toExpenseRecord } from '@/utils/financial/recordConverters';
import type { BeneficiaryDashboardData } from '@/hooks/page/beneficiary/useBeneficiaryDashboardData';

export function useBeneficiaryFinancials(dashData: BeneficiaryDashboardData | undefined, fiscalYearId?: string | null) {
  const account = dashData?.account;
  const isAccountMissing = !account && !!fiscalYearId && fiscalYearId !== 'all';

  const totalIncome = safeNumber(dashData?.total_income);
  const totalExpenses = safeNumber(dashData?.total_expenses);
  const netAfterExpenses = safeNumber(account?.net_after_expenses);
  const vatAmount = safeNumber(account?.vat_amount);
  const netAfterVat = safeNumber(account?.net_after_vat);
  const zakatAmount = safeNumber(account?.zakat_amount);
  const netAfterZakat = Math.max(0, netAfterVat - zakatAmount);
  const adminShare = safeNumber(account?.admin_share);
  const waqifShare = safeNumber(account?.waqif_share);
  const waqfRevenue = safeNumber(account?.waqf_revenue);
  const waqfCorpusManual = safeNumber(account?.waqf_corpus_manual);
  const waqfCorpusPrevious = safeNumber(account?.waqf_corpus_previous);
  const availableAmount = safeNumber(dashData?.available_amount);
  const distributionsAmount = safeNumber(account?.distributions_amount);
  const grandTotal = totalIncome + waqfCorpusPrevious;

  const incomeBySource = useMemo(
    () => toSourceRecord(dashData?.income_by_source ?? []),
    [dashData?.income_by_source],
  );

  const expensesByTypeExcludingVat = useMemo(
    () => toExpenseRecord(dashData?.expenses_by_type_excluding_vat ?? []),
    [dashData?.expenses_by_type_excluding_vat],
  );

  const beneficiaries = useMemo(() => {
    if (!dashData?.beneficiary) return [];
    return [dashData.beneficiary];
  }, [dashData?.beneficiary]);

  return {
    account, isAccountMissing,
    totalIncome, totalExpenses, netAfterExpenses, vatAmount,
    netAfterVat, zakatAmount, netAfterZakat, adminShare, waqifShare,
    waqfRevenue, waqfCorpusManual, waqfCorpusPrevious, availableAmount,
    distributionsAmount, grandTotal,
    incomeBySource, expensesByTypeExcludingVat,
    beneficiaries,
  };
}
