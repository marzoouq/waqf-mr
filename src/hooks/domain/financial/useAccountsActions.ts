/**
 * عمليات صفحة الحسابات — حفظ، إقفال سنة، تصدير PDF
 * يستقبل القيم المحسوبة الحقيقية مباشرة — بدون أصفار أو paramsRef خارجي
 */
import { useState, useRef } from 'react';
import { useCreateAccount } from '@/hooks/data/financial/useAccounts';
import { useCloseFiscalYear } from '@/hooks/data/financial/useCloseFiscalYear';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { notifyAllBeneficiaries } from '@/lib/services';
import { defaultNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { fmt } from '@/utils/format/format';
import type { Account, Contract, Beneficiary } from '@/types';

interface ActionsParams {
  selectedFY: { id: string; label: string; status: string } | null;
  fiscalYear: string;
  fiscalYearId: string | undefined;
  accounts: Account[];
  totalIncome: number;
  totalExpenses: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  netAfterExpenses: number;
  netAfterVat: number;
  netAfterZakat: number;
  grandTotal: number;
  availableAmount: number;
  remainingBalance: number;
  contracts: Contract[];
  beneficiaries: Beneficiary[];
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  // قيم الإعدادات المطلوبة لبناء بيانات الحساب
  manualVat: number;
  manualDistributions: number;
  zakatAmount: number;
  waqfCorpusManual: number;
  waqfCorpusPrevious: number;
}

export function useAccountsActions(params: ActionsParams) {
  const { role } = useAuth();
  const createAccount = useCreateAccount();
  const closeFiscalYear = useCloseFiscalYear();

  // مرجع داخلي يُحدّث تلقائياً في كل render — يُستخدم في callbacks غير متزامنة
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const [closeYearOpen, setCloseYearOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const buildAccountData = () => {
    const p = paramsRef.current;
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
  };

  const handleCreateAccount = async () => {
    try {
      await createAccount.mutateAsync(buildAccountData());
      const p = paramsRef.current;
      notifyAllBeneficiaries(
        'تحديث الحسابات الختامية',
        `تم تحديث الحسابات الختامية للسنة المالية ${p.selectedFY?.label || p.fiscalYear}`,
        'info', '/beneficiary/accounts',
      );
      if (p.manualDistributions > 0) {
        notifyAllBeneficiaries(
          'تحديث التوزيعات المالية',
          `تم تحديث توزيعات الأرباح للسنة المالية ${p.selectedFY?.label || p.fiscalYear}. يرجى مراجعة حصتك`,
          'info', '/beneficiary/my-share',
        );
      }
    } catch (err) {
      logger.error('خطأ في حفظ الحسابات:', err instanceof Error ? err.message : err);
      defaultNotify.error('خطأ في حفظ الحسابات');
    }
  };

  const handleCloseYear = async () => {
    const p = paramsRef.current;
    if (!p.selectedFY || p.selectedFY.status === 'closed') return;
    if (role !== 'admin') {
      defaultNotify.error('فقط الناظر يمكنه إقفال السنة المالية');
      return;
    }
    try {
      const accountData = buildAccountData();
      const rpcResult = await closeFiscalYear.mutateAsync({
        fiscalYearId: p.selectedFY.id,
        accountData,
        waqfCorpusManual: p.waqfCorpusManual,
      });

      notifyAllBeneficiaries(
        'إقفال السنة المالية',
        `تم إقفال السنة المالية ${p.selectedFY.label} وأرشفة جميع البيانات. تم ترحيل رقبة الوقف (${fmt(p.waqfCorpusManual)} ر.س) للسنة الجديدة.`,
        'info', '/beneficiary/accounts',
      );

      if (rpcResult?.warnings && rpcResult.warnings.length > 0) {
        for (const w of rpcResult.warnings) {
          defaultNotify.warning(w, { duration: 10000 });
        }
      }
      defaultNotify.success(`تم إقفال السنة المالية ${rpcResult?.closed_label || p.selectedFY.label} وترحيل الرصيد بنجاح`);
      defaultNotify.info('تنبيه: السنة المالية الجديدة غير منشورة — يرجى نشرها من إعدادات السنوات المالية ليتمكن المستفيدون من رؤيتها', { duration: 8000 });
      setCloseYearOpen(false);
    } catch (err) {
      logger.error('خطأ في إقفال السنة:', err instanceof Error ? err.message : err);
      defaultNotify.error('خطأ في إقفال السنة المالية');
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const p = paramsRef.current;
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
      });
      defaultNotify.success('تم تصدير التقرير بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير التقرير');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return {
    isExportingPdf,
    handleCreateAccount, handleCloseYear, handleExportPdf,
    closeYearOpen, setCloseYearOpen, isClosingYear: closeFiscalYear.isPending,
    createAccountPending: createAccount.isPending,
  };
}
