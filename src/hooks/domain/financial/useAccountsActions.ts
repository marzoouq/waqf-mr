/**
 * عمليات صفحة الحسابات — حفظ، إقفال سنة، تصدير PDF.
 * يستقبل القيم المحسوبة الحقيقية مباشرة — بدون أصفار أو paramsRef خارجي.
 */
import { useState, useRef, useEffect } from 'react';
import { useCreateAccount } from '@/hooks/data/financial/accounts/useAccounts';
import { useCloseFiscalYear } from '@/hooks/data/financial/fiscalYears/useCloseFiscalYear';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { notifyAllBeneficiaries } from '@/lib/services';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { fmt } from '@/utils/format/format';
import type { AccountsActionsParams } from '@/types/financial/accountsActions';
import { buildAccountData, exportAccountsPdf } from './accountsActions/exportAccountsPdf';

export function useAccountsActions(params: AccountsActionsParams) {
  const { role } = useAuth();
  const createAccount = useCreateAccount();
  const closeFiscalYear = useCloseFiscalYear();

  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  const [closeYearOpen, setCloseYearOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleCreateAccount = async () => {
    const p = paramsRef.current;
    if (!p.selectedFY?.id) {
      uiNotify.error('يرجى اختيار سنة مالية أولاً قبل إنشاء الحساب الختامي');
      return;
    }
    try {
      await createAccount.mutateAsync(buildAccountData(p));
      const label = p.selectedFY?.label || p.fiscalYear;
      notifyAllBeneficiaries('تحديث الحسابات الختامية', `تم تحديث الحسابات الختامية للسنة المالية ${label}`, 'info', '/beneficiary/accounts');
      if (p.manualDistributions > 0) {
        notifyAllBeneficiaries('تحديث التوزيعات المالية', `تم تحديث توزيعات الأرباح للسنة المالية ${label}. يرجى مراجعة حصتك`, 'info', '/beneficiary/my-share');
      }
    } catch (err) {
      logger.error('خطأ في حفظ الحسابات:', err instanceof Error ? err.message : err);
      uiNotify.error('خطأ في حفظ الحسابات');
    }
  };

  const handleCloseYear = async () => {
    const p = paramsRef.current;
    if (!p.selectedFY || p.selectedFY.status === 'closed') return;
    if (role !== 'admin') { uiNotify.error('فقط الناظر يمكنه إقفال السنة المالية'); return; }
    try {
      const rpcResult = await closeFiscalYear.mutateAsync({
        fiscalYearId: p.selectedFY.id,
        accountData: buildAccountData(p),
        waqfCorpusManual: p.waqfCorpusManual,
      });
      notifyAllBeneficiaries(
        'إقفال السنة المالية',
        `تم إقفال السنة المالية ${p.selectedFY.label} وأرشفة جميع البيانات. تم ترحيل رقبة الوقف (${fmt(p.waqfCorpusManual)} ر.س) للسنة الجديدة.`,
        'info', '/beneficiary/accounts',
      );
      if (rpcResult?.warnings?.length) {
        for (const w of rpcResult.warnings) uiNotify.warning(w, { duration: 10000 });
      }
      uiNotify.success(`تم إقفال السنة المالية ${rpcResult?.closed_label || p.selectedFY.label} وترحيل الرصيد بنجاح`);
      uiNotify.info('تنبيه: السنة المالية الجديدة غير منشورة — يرجى نشرها من إعدادات السنوات المالية ليتمكن المستفيدون من رؤيتها', { duration: 8000 });
      setCloseYearOpen(false);
    } catch (err) {
      logger.error('خطأ في إقفال السنة:', err instanceof Error ? err.message : err);
      uiNotify.error('خطأ في إقفال السنة المالية');
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try { await exportAccountsPdf(paramsRef.current); }
    finally { setIsExportingPdf(false); }
  };

  return {
    isExportingPdf,
    handleCreateAccount, handleCloseYear, handleExportPdf,
    closeYearOpen, setCloseYearOpen,
    isClosingYear: closeFiscalYear.isPending,
    createAccountPending: createAccount.isPending,
  };
}
