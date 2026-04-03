/**
 * عمليات صفحة الحسابات — حفظ، إقفال سنة، تصدير PDF
 * يستقبل القيم المحسوبة الحقيقية مباشرة — بدون أصفار أو paramsRef خارجي
 */
import { useState, useRef } from 'react';
import { useCreateAccount } from '@/hooks/financial/useAccounts';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { notifyAllBeneficiaries } from '@/lib/services';
import { defaultNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { fmt } from '@/utils/format';
import type { Account, Contract, Beneficiary } from '@/types/database';

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
  const queryClient = useQueryClient();
  const createAccount = useCreateAccount();

  // مرجع داخلي يُحدّث تلقائياً في كل render — يُستخدم في callbacks غير متزامنة
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const [closeYearOpen, setCloseYearOpen] = useState(false);
  const [isClosingYear, setIsClosingYear] = useState(false);
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
    setIsClosingYear(true);
    try {
      const accountData = buildAccountData();
      const { data: result, error } = await supabase.rpc('close_fiscal_year', {
        p_fiscal_year_id: p.selectedFY.id,
        p_account_data: JSON.parse(JSON.stringify(accountData)),
        p_waqf_corpus_manual: p.waqfCorpusManual,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['tenant_payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment_invoices'] });

      notifyAllBeneficiaries(
        'إقفال السنة المالية',
        `تم إقفال السنة المالية ${p.selectedFY.label} وأرشفة جميع البيانات. تم ترحيل رقبة الوقف (${fmt(p.waqfCorpusManual)} ر.س) للسنة الجديدة.`,
        'info', '/beneficiary/accounts',
      );

      const rpcResult = result as { closed_label?: string; next_label?: string; warnings?: string[] } | null;
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
    } finally {
      setIsClosingYear(false);
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
    closeYearOpen, setCloseYearOpen, isClosingYear,
    createAccountPending: createAccount.isPending,
  };
}
