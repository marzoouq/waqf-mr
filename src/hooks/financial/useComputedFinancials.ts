import { useMemo } from 'react';
import type { Income, Expense } from '@/types/database';
import type { Tables } from '@/integrations/supabase/types';
import {
  computeTotals,
  calculateFinancials,
  groupIncomeBySource,
  groupExpensesByType,
} from '@/utils/accountsCalculations';
import { activeYearFinancials } from '@/utils/financials/activeYearFinancials';
import { closedYearFinancials } from '@/utils/financials/closedYearFinancials';
import { isFyAll } from '@/constants/fiscalYearIds';
import { safeNumber, safePercent } from '@/utils/safeNumber';
import { isFyAll } from '@/constants/fiscalYearIds';

interface ComputedParams {
  income: Income[];
  expenses: Expense[];
  accounts: Tables<'accounts'>[];
  settings: Record<string, string> | null | undefined;
  fiscalYearLabel?: string;
  fiscalYearId?: string;
  /** Override: when true, always compute shares (used in AccountsPage) */
  forceClosedMode?: boolean;
  /** Fiscal year status */
  fiscalYearStatus?: string;
}

// كلمات الضريبة المحددة فقط
const VAT_KEYWORDS = ['ضريبة القيمة المضافة', 'vat', 'ضريبة قيمة مضافة'] as const;

/**
 * Pure computation hook — derives all financial metrics from raw data.
 */
export const useComputedFinancials = ({
  income,
  expenses,
  accounts,
  settings,
  fiscalYearLabel,
  fiscalYearId,
  forceClosedMode,
  fiscalYearStatus,
}: ComputedParams) => {
  const { totalIncome, totalExpenses } = useMemo(
    () => computeTotals(income, expenses),
    [income, expenses],
  );

  const currentAccount = useMemo(() => {
    if (fiscalYearId) {
      const byId = accounts.find(a => a.fiscal_year_id === fiscalYearId);
      if (byId) return byId;
    }
    if (fiscalYearLabel) {
      return accounts.find(a => a.fiscal_year === fiscalYearLabel) || null;
    }
    
    return null;
  }, [accounts, fiscalYearId, fiscalYearLabel]);

  const {
    adminPct, waqifPct, zakatAmount, vatAmount,
    waqfCorpusPrevious, waqfCorpusManual, distributionsAmount,
    usingFallbackPct,
  } = useMemo(() => {
    const _adminPct = safePercent(settings?.admin_share_percentage, 10);
    const _waqifPct = safePercent(settings?.waqif_share_percentage, 5);
    // تتبع استخدام القيم الافتراضية
    const _usingFallback = (settings?.admin_share_percentage === null || settings?.admin_share_percentage === undefined || settings.admin_share_percentage === '')
      || (settings?.waqif_share_percentage === null || settings?.waqif_share_percentage === undefined || settings.waqif_share_percentage === '');
    const _zakatAmount = currentAccount ? safeNumber(currentAccount.zakat_amount) : 0;
    const _vatAmount = currentAccount ? safeNumber(currentAccount.vat_amount) : 0;
    const _waqfCorpusPrevious = currentAccount ? safeNumber(currentAccount.waqf_corpus_previous) : 0;
    const _waqfCorpusManual = currentAccount ? safeNumber(currentAccount.waqf_corpus_manual) : 0;
    const _distributionsAmount = currentAccount ? safeNumber(currentAccount.distributions_amount) : 0;
    return {
      adminPct: _adminPct, waqifPct: _waqifPct, zakatAmount: _zakatAmount,
      vatAmount: _vatAmount, waqfCorpusPrevious: _waqfCorpusPrevious,
      waqfCorpusManual: _waqfCorpusManual, distributionsAmount: _distributionsAmount,
      usingFallbackPct: _usingFallback,
    };
  }, [settings, currentAccount]);

  // Determine if fiscal year is closed for share calculation
  const isClosed = forceClosedMode || fiscalYearStatus === 'closed';

  const financials = useMemo(() => {
  if (currentAccount) {
      // في السنة النشطة: حساب من البيانات الحية بدلاً من القيم المخزنة
      if (!isClosed) {
        const grandTotal = totalIncome + waqfCorpusPrevious;
        // netAfterExpenses يجب أن يشمل waqfCorpusPrevious لتتناسق مع grandTotal
        const liveNetAfterExpenses = grandTotal - totalExpenses;
        const liveNetAfterVat = liveNetAfterExpenses - vatAmount;
        const liveNetAfterZakat = liveNetAfterVat - zakatAmount;
        return {
          grandTotal,
          netAfterExpenses: liveNetAfterExpenses,
          netAfterVat: liveNetAfterVat,
          netAfterZakat: liveNetAfterZakat,
          shareBase: Math.max(0, totalIncome - totalExpenses - zakatAmount),
          adminShare: 0,
          waqifShare: 0,
          waqfRevenue: 0,
          availableAmount: 0,
          remainingBalance: 0,
          isDeficit: false,
        };
      }

      // ✅ إصلاح #2: في السنة المقفلة — استخدام القيم المخزنة بالكامل لمنع التناقض بين live و stored
      const storedTotalIncome = safeNumber(currentAccount.total_income);
      const storedNetAfterVat = safeNumber(currentAccount.net_after_vat);
      const storedZakat = safeNumber(currentAccount.zakat_amount);
      const storedAdminShare = safeNumber(currentAccount.admin_share);
      const storedWaqifShare = safeNumber(currentAccount.waqif_share);
      const storedWaqfRevenue = safeNumber(currentAccount.waqf_revenue);
      // ✅ إصلاح #2: grandTotal يعتمد على totalIncome المخزن لا الحي
      const grandTotal = storedTotalIncome + waqfCorpusPrevious;
      // ✅ إصلاح #1: Math.max(0) لمنع shareBase السالب عند العجز
      const shareBase = Math.max(0, storedTotalIncome - safeNumber(currentAccount.total_expenses) - storedZakat);
      return {
        grandTotal,
        netAfterExpenses: safeNumber(currentAccount.net_after_expenses),
        netAfterVat: storedNetAfterVat,
        netAfterZakat: storedNetAfterVat - storedZakat,
        shareBase,
        adminShare: storedAdminShare,
        waqifShare: storedWaqifShare,
        waqfRevenue: storedWaqfRevenue,
        availableAmount: storedWaqfRevenue - waqfCorpusManual,
        remainingBalance: storedWaqfRevenue - waqfCorpusManual - distributionsAmount,
        isDeficit: (storedWaqfRevenue - waqfCorpusManual) < 0 || (storedWaqfRevenue - waqfCorpusManual - distributionsAmount) < 0,
      };
    }
    return calculateFinancials({
      totalIncome,
      totalExpenses,
      waqfCorpusPrevious,
      manualVat: vatAmount,
      zakatAmount,
      adminPercent: adminPct,
      waqifPercent: waqifPct,
      waqfCorpusManual,
      manualDistributions: distributionsAmount,
      isClosed,
    });
  }, [
    currentAccount, totalIncome, totalExpenses, waqfCorpusPrevious,
    vatAmount, zakatAmount, adminPct, waqifPct, waqfCorpusManual, distributionsAmount,
    isClosed,
  ]);

  const incomeBySource = useMemo(() => groupIncomeBySource(income), [income]);
  const expensesByType = useMemo(() => groupExpensesByType(expenses), [expenses]);
  
  const expensesByTypeExcludingVat = useMemo(() => {
    const filtered = expenses.filter(e => {
      const desc = (e.description || '').trim().toLowerCase();
      const type = (e.expense_type || '').trim().toLowerCase();
      return !VAT_KEYWORDS.some((kw: string) => desc.includes(kw) || type.includes(kw));
    });
    return groupExpensesByType(filtered);
  }, [expenses]);

  // إذا كانت هناك سنة مالية محددة ولم يُعثر على الحساب الختامي
  const isAccountMissing = !currentAccount && !!fiscalYearId && !isFyAll(fiscalYearId);

  return {
    currentAccount,
    isAccountMissing,
    usingFallbackPct,
    adminPct,
    waqifPct,
    totalIncome,
    totalExpenses,
    zakatAmount,
    vatAmount,
    waqfCorpusPrevious,
    waqfCorpusManual,
    distributionsAmount,
    ...financials,
    incomeBySource,
    expensesByType,
    expensesByTypeExcludingVat,
  };
};
