/**
 * إعدادات ونسب صفحة الحسابات — adminPercent, waqifPercent, إلخ
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { defaultNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { useStableRef } from '@/lib/hooks/useStableRef';
import { findAccountByFY } from '@/utils/financial/findAccountByFY';
import type { Account } from '@/types/database';

interface SettingsParams {
  selectedFY: { id: string; label: string; status: string } | null;
  accounts: Account[];
}

export function useAccountsSettings(params: SettingsParams) {
  const appSettings = useAppSettings();

  const [adminPercent, setAdminPercent] = useState(10);
  const [waqifPercent, setWaqifPercent] = useState(5);
  const [fiscalYear, setFiscalYear] = useState('');
  const [zakatAmount, setZakatAmount] = useState(0);
  const [waqfCorpusManual, setWaqfCorpusManual] = useState(0);
  const [waqfCorpusPrevious, setWaqfCorpusPrevious] = useState(0);
  const [manualVat, setManualVat] = useState(0);
  const [manualDistributions, setManualDistributions] = useState(0);

  // مزامنة من إعدادات الخادم — مطلوبة للحفاظ على state محلي قابل للتحرير في النماذج
  useEffect(() => {
    if (appSettings.data) {
      const settings = appSettings.data;
      /* eslint-disable react-hooks/set-state-in-effect -- intentional sync of editable form state from server settings on initial load / change */
      if (settings['admin_share_percentage']) setAdminPercent(Number(settings['admin_share_percentage']));
      if (settings['waqif_share_percentage']) setWaqifPercent(Number(settings['waqif_share_percentage']));
      if (settings['fiscal_year']) setFiscalYear(settings['fiscal_year']);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [appSettings.data]);

  // مزامنة من حساب السنة المختارة — قيم قابلة للتحرير في صفحة الحسابات
  useEffect(() => {
    const matchingAccount = findAccountByFY(params.accounts, params.selectedFY);
    /* eslint-disable react-hooks/set-state-in-effect -- intentional sync of editable form state from selected fiscal year account */
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
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [params.accounts, params.selectedFY]);

  const saveSettingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const updateSettingRef = useStableRef(appSettings.updateSetting.mutateAsync);

  const saveSetting = useCallback(async (key: string, value: string) => {
    if (saveSettingTimeouts.current[key]) clearTimeout(saveSettingTimeouts.current[key]);
    saveSettingTimeouts.current[key] = setTimeout(async () => {
      try {
        await updateSettingRef.current({ key, value });
        defaultNotify.success('تم حفظ الإعداد');
      } catch (err) {
        logger.error('خطأ في حفظ الإعداد:', err instanceof Error ? err.message : err);
        defaultNotify.error('خطأ في حفظ الإعداد');
      }
    }, 500);
  }, [updateSettingRef]);

  const handleAdminPercentChange = (val: string) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      defaultNotify.error('نسبة الناظر يجب أن تكون رقماً بين 0 و 100');
      return;
    }
    setAdminPercent(num);
    saveSetting('admin_share_percentage', val);
  };

  const handleWaqifPercentChange = (val: string) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      defaultNotify.error('نسبة الواقف يجب أن تكون رقماً بين 0 و 100');
      return;
    }
    setWaqifPercent(num);
    saveSetting('waqif_share_percentage', val);
  };

  const handleFiscalYearChange = (val: string) => {
    setFiscalYear(val);
    saveSetting('fiscal_year', val);
  };

  const currentAccount = findAccountByFY(params.accounts, params.selectedFY);
  const adminPctSetting = appSettings.data?.['admin_share_percentage'];
  const waqifPctSetting = appSettings.data?.['waqif_share_percentage'];
  const usingFallbackPct =
    adminPctSetting === null || adminPctSetting === undefined ||
    waqifPctSetting === null || waqifPctSetting === undefined;

  return {
    adminPercent, waqifPercent, zakatAmount, waqfCorpusManual, waqfCorpusPrevious,
    manualVat, manualDistributions, fiscalYear, usingFallbackPct, currentAccount,
    setWaqfCorpusPrevious, setManualVat, setZakatAmount, setWaqfCorpusManual, setManualDistributions,
    handleAdminPercentChange, handleWaqifPercentChange, handleFiscalYearChange,
  };
}
