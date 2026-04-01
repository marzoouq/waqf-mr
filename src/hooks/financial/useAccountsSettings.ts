/**
 * إعدادات النسب المالية — مفصولة من useAccountsActions
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import { defaultNotify } from '@/hooks/data/mutationNotify';
import { logger } from '@/lib/logger';
import { findAccountByFY } from '@/utils/findAccountByFY';
import type { Account } from '@/types/database';

interface SettingsParams {
  accounts: Account[];
  selectedFY: { id: string; label: string; status: string } | null;
}

export function useAccountsSettings(params: SettingsParams) {
  const appSettings = useAppSettings();

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
        defaultNotify.success('تم حفظ الإعداد');
      } catch (err) {
        logger.error('خطأ في حفظ الإعداد:', err instanceof Error ? err.message : err);
        defaultNotify.error('خطأ في حفظ الإعداد');
      }
    }, 500);
  }, []);

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
  const usingFallbackPct = !appSettings.data?.['admin_share_percentage'] || !appSettings.data?.['waqif_share_percentage'];

  return {
    adminPercent, waqifPercent, zakatAmount, waqfCorpusManual, waqfCorpusPrevious,
    manualVat, manualDistributions, fiscalYear, usingFallbackPct, currentAccount,
    setWaqfCorpusPrevious, setManualVat, setZakatAmount, setWaqfCorpusManual, setManualDistributions,
    handleAdminPercentChange, handleWaqifPercentChange, handleFiscalYearChange,
  };
}
