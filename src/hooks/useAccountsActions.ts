/**
 * عمليات صفحة الحسابات — حفظ، إقفال سنة، تصدير PDF
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useCreateAccount } from '@/hooks/useAccounts';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { notifyAllBeneficiaries } from '@/utils/notifications';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { fmt } from '@/utils/format';
import { findAccountByFY } from './useAccountsPage';

interface ActionsParams {
  selectedFY: { id: string; label: string; status: string } | null;
  fiscalYear: string;
  fiscalYearId: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accounts: any[];
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contracts: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beneficiaries: any[];
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  appSettingsData: Record<string, string> | undefined;
}

export function useAccountsActions(params: ActionsParams) {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const createAccount = useCreateAccount();
  const appSettings = useAppSettings();

  const [closeYearOpen, setCloseYearOpen] = useState(false);
  const [isClosingYear, setIsClosingYear] = useState(false);

  // إعدادات قابلة للتعديل
  const [adminPercent, setAdminPercent] = useState(10);
  const [waqifPercent, setWaqifPercent] = useState(5);
  const [fiscalYear, setFiscalYear] = useState('');
  const [zakatAmount, setZakatAmount] = useState(0);
  const [waqfCorpusManual, setWaqfCorpusManual] = useState(0);
  const [waqfCorpusPrevious, setWaqfCorpusPrevious] = useState(0);
  const [manualVat, setManualVat] = useState(0);
  const [manualDistributions, setManualDistributions] = useState(0);

  useEffect(() => {
    if (appSettings.data) {
      const settings = appSettings.data;
      if (settings['admin_share_percentage']) setAdminPercent(Number(settings['admin_share_percentage']));
      if (settings['waqif_share_percentage']) setWaqifPercent(Number(settings['waqif_share_percentage']));
      if (settings['fiscal_year']) setFiscalYear(settings['fiscal_year']);
    }
  }, [appSettings.data]);

  useEffect(() => {
    const matchingAccount = findAccountByFY(params.accounts, params.selectedFY);
    if (matchingAccount) {
      if (matchingAccount.zakat_amount !== undefined) setZakatAmount(Number(matchingAccount.zakat_amount));
      if (matchingAccount.waqf_corpus_manual !== undefined) setWaqfCorpusManual(Number(matchingAccount.waqf_corpus_manual));
      if (matchingAccount.waqf_corpus_previous !== undefined) setWaqfCorpusPrevious(Number(matchingAccount.waqf_corpus_previous));
      if (matchingAccount.vat_amount !== undefined) setManualVat(Number(matchingAccount.vat_amount));
      if (matchingAccount.distributions_amount !== undefined) setManualDistributions(Number(matchingAccount.distributions_amount));
    } else {
      setZakatAmount(0);
      setWaqfCorpusManual(0);
      setWaqfCorpusPrevious(0);
      setManualVat(0);
      setManualDistributions(0);
    }
  }, [params.accounts, params.selectedFY]);

  const saveSettingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const updateSettingRef = useRef(appSettings.updateSetting.mutateAsync);
  updateSettingRef.current = appSettings.updateSetting.mutateAsync;

  const saveSetting = useCallback(async (key: string, value: string) => {
    if (saveSettingTimeouts.current[key]) clearTimeout(saveSettingTimeouts.current[key]);
    saveSettingTimeouts.current[key] = setTimeout(async () => {
      try {
        await updateSettingRef.current({ key, value });
        toast.success('تم حفظ الإعداد');
      } catch (err) {
        logger.error('خطأ في حفظ الإعداد:', err instanceof Error ? err.message : err);
        toast.error('خطأ في حفظ الإعداد');
      }
    }, 500);
  }, []);

  const handleAdminPercentChange = (val: string) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      toast.error('نسبة الناظر يجب أن تكون رقماً بين 0 و 100');
      return;
    }
    setAdminPercent(num);
    saveSetting('admin_share_percentage', val);
  };

  const handleWaqifPercentChange = (val: string) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      toast.error('نسبة الواقف يجب أن تكون رقماً بين 0 و 100');
      return;
    }
    setWaqifPercent(num);
    saveSetting('waqif_share_percentage', val);
  };

  const handleFiscalYearChange = (val: string) => {
    setFiscalYear(val);
    saveSetting('fiscal_year', val);
  };

  const buildAccountData = () => ({
    fiscal_year: params.selectedFY?.label || fiscalYear,
    fiscal_year_id: params.selectedFY?.id || '',
    total_income: params.totalIncome,
    total_expenses: params.totalExpenses,
    admin_share: params.adminShare,
    waqif_share: params.waqifShare,
    waqf_revenue: params.waqfRevenue,
    vat_amount: manualVat,
    distributions_amount: manualDistributions,
    net_after_expenses: params.netAfterExpenses,
    net_after_vat: params.netAfterVat,
    zakat_amount: zakatAmount,
    waqf_corpus_manual: waqfCorpusManual,
    waqf_corpus_previous: waqfCorpusPrevious,
  });

  const handleCreateAccount = async () => {
    try {
      await createAccount.mutateAsync(buildAccountData());
      notifyAllBeneficiaries(
        'تحديث الحسابات الختامية',
        `تم تحديث الحسابات الختامية للسنة المالية ${params.selectedFY?.label || fiscalYear}`,
        'info', '/beneficiary/accounts',
      );
      if (manualDistributions > 0) {
        notifyAllBeneficiaries(
          'تحديث التوزيعات المالية',
          `تم تحديث توزيعات الأرباح للسنة المالية ${params.selectedFY?.label || fiscalYear}. يرجى مراجعة حصتك`,
          'info', '/beneficiary/my-share',
        );
      }
    } catch (err) {
      logger.error('خطأ في حفظ الحسابات:', err instanceof Error ? err.message : err);
      toast.error('خطأ في حفظ الحسابات');
    }
  };

  const handleCloseYear = async () => {
    if (!params.selectedFY || params.selectedFY.status === 'closed') return;
    if (role !== 'admin') {
      toast.error('فقط الناظر يمكنه إقفال السنة المالية');
      return;
    }
    setIsClosingYear(true);
    try {
      const accountData = buildAccountData();
      const { data: result, error } = await supabase.rpc('close_fiscal_year', {
        p_fiscal_year_id: params.selectedFY.id,
        p_account_data: JSON.parse(JSON.stringify(accountData)),
        p_waqf_corpus_manual: waqfCorpusManual,
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
        `تم إقفال السنة المالية ${params.selectedFY.label} وأرشفة جميع البيانات. تم ترحيل رقبة الوقف (${fmt(waqfCorpusManual)} ر.س) للسنة الجديدة.`,
        'info', '/beneficiary/accounts',
      );

      const rpcResult = result as { closed_label?: string; next_label?: string; warnings?: string[] } | null;
      if (rpcResult?.warnings && rpcResult.warnings.length > 0) {
        for (const w of rpcResult.warnings) {
          toast.warning(w, { duration: 10000 });
        }
      }
      toast.success(`تم إقفال السنة المالية ${rpcResult?.closed_label || params.selectedFY.label} وترحيل الرصيد بنجاح`);
      toast.info('تنبيه: السنة المالية الجديدة غير منشورة — يرجى نشرها من إعدادات السنوات المالية ليتمكن المستفيدون من رؤيتها', { duration: 8000 });
      setCloseYearOpen(false);
    } catch (err) {
      logger.error('خطأ في إقفال السنة:', err instanceof Error ? err.message : err);
      toast.error('خطأ في إقفال السنة المالية');
    } finally {
      setIsClosingYear(false);
    }
  };

  const handleExportPdf = async () => {
    const { generateAccountsPDF } = await import('@/utils/pdf');
    await generateAccountsPDF({
      contracts: params.contracts,
      incomeBySource: params.incomeBySource,
      expensesByType: params.expensesByType,
      totalIncome: params.totalIncome,
      totalExpenses: params.totalExpenses,
      netRevenue: params.netAfterZakat,
      adminShare: params.adminShare,
      waqifShare: params.waqifShare,
      waqfRevenue: params.waqfRevenue,
      beneficiaries: params.beneficiaries,
      vatAmount: manualVat,
      distributionsAmount: manualDistributions,
      waqfCorpusManual,
      zakatAmount,
      netAfterZakat: params.netAfterZakat,
      waqfCorpusPrevious,
      grandTotal: params.grandTotal,
      availableAmount: params.availableAmount,
      remainingBalance: params.remainingBalance,
    });
  };

  const currentAccount = findAccountByFY(params.accounts, params.selectedFY);
  const usingFallbackPct = !appSettings.data?.['admin_share_percentage'] || !appSettings.data?.['waqif_share_percentage'];

  return {
    // الإعدادات
    adminPercent, waqifPercent, zakatAmount, waqfCorpusManual, waqfCorpusPrevious,
    manualVat, manualDistributions, fiscalYear, usingFallbackPct, currentAccount,
    // Setters
    setWaqfCorpusPrevious, setManualVat, setZakatAmount, setWaqfCorpusManual, setManualDistributions,
    // Handlers
    handleAdminPercentChange, handleWaqifPercentChange, handleFiscalYearChange,
    handleCreateAccount, handleCloseYear, handleExportPdf,
    // Close year dialog
    closeYearOpen, setCloseYearOpen, isClosingYear,
    createAccountPending: createAccount.isPending,
  };
}
