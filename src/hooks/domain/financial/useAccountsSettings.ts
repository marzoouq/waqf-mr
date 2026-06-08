/**
 * إعدادات ونسب صفحة الحسابات — adminPercent, waqifPercent, إلخ
 *
 * نمط Default + Override:
 *   - القيم المشتقّة (`derivedDefaults`) محسوبة من `appSettings.data` و`selectedAccount` عبر `useMemo`.
 *   - تعديلات المستخدم تُخزَّن في `overrides` (Partial state).
 *   - القيمة المعروضة = override ?? default.
 *   - عند تغيّر السنة المالية المختارة (`selectedFY.id`) تُمسح overrides تلقائياً (إعادة ضبط النموذج
 *     لقيم السنة الجديدة) باستخدام نمط React الرسمي "تحديث state أثناء render مع مفتاح سابق".
 *
 * هذا يحلّ محل 13 `useEffect`/`setState` للمزامنة، ويزيل تحذيرات `react-hooks/set-state-in-effect`.
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { useStableRef } from '@/lib/hooks/useStableRef';
import { findAccountByFY } from '@/utils/financial/fiscalYear/findAccountByFY';
import type { Account } from '@/types';

interface SettingsParams {
  selectedFY: { id: string; label: string; status: string } | null;
  accounts: Account[];
}

interface SettingsValues {
  adminPercent: number;
  waqifPercent: number;
  fiscalYear: string;
  zakatAmount: number;
  waqfCorpusManual: number;
  waqfCorpusPrevious: number;
  manualVat: number;
  manualDistributions: number;
}

type Overrides = Partial<SettingsValues>;

const PCT_FALLBACK = { admin: 10, waqif: 5 } as const;

export function useAccountsSettings(params: SettingsParams) {
  const appSettings = useAppSettings();

  const currentAccount = useMemo(
    () => findAccountByFY(params.accounts, params.selectedFY),
    [params.accounts, params.selectedFY]
  );

  // القيم المشتقّة من المصدر (إعدادات الخادم + حساب السنة المختارة)
  const derivedDefaults = useMemo<SettingsValues>(() => {
    const settings = appSettings.data ?? {};
    const acc = currentAccount;
    return {
      adminPercent: Number(settings['admin_share_percentage'] ?? PCT_FALLBACK.admin),
      waqifPercent: Number(settings['waqif_share_percentage'] ?? PCT_FALLBACK.waqif),
      fiscalYear: String(settings['fiscal_year'] ?? ''),
      zakatAmount: Number(acc?.zakat_amount ?? 0),
      waqfCorpusManual: Number(acc?.waqf_corpus_manual ?? 0),
      waqfCorpusPrevious: Number(acc?.waqf_corpus_previous ?? 0),
      manualVat: Number(acc?.vat_amount ?? 0),
      manualDistributions: Number(acc?.distributions_amount ?? 0),
    };
  }, [appSettings.data, currentAccount]);

  const [overrides, setOverrides] = useState<Overrides>({});

  // إعادة ضبط overrides عند تغيّر السنة المالية (نمط React الرسمي: setState أثناء render مع مفتاح سابق)
  const sourceKey = params.selectedFY?.id ?? '';
  const lastSourceKeyRef = useRef(sourceKey);
  if (lastSourceKeyRef.current !== sourceKey) {
    lastSourceKeyRef.current = sourceKey;
    setOverrides({});
  }

  // القيم النهائية (override يتقدّم على القيمة المشتقّة)
  const resolved: SettingsValues = useMemo(
    () => ({ ...derivedDefaults, ...overrides }),
    [derivedDefaults, overrides]
  );

  // دوال تعديل override فقط (تستخدمها UI كـ setters متوافقة مع الواجهة السابقة)
  const updateOverride = useCallback(<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
  }, []);

  const setZakatAmount = useCallback((v: number) => updateOverride('zakatAmount', v), [updateOverride]);
  const setWaqfCorpusManual = useCallback((v: number) => updateOverride('waqfCorpusManual', v), [updateOverride]);
  const setWaqfCorpusPrevious = useCallback((v: number) => updateOverride('waqfCorpusPrevious', v), [updateOverride]);
  const setManualVat = useCallback((v: number) => updateOverride('manualVat', v), [updateOverride]);
  const setManualDistributions = useCallback((v: number) => updateOverride('manualDistributions', v), [updateOverride]);

  // حفظ إعدادات الخادم (debounced)
  const saveSettingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const updateSettingRef = useStableRef(appSettings.updateSetting.mutateAsync);

  const saveSetting = useCallback(async (key: string, value: string) => {
    if (saveSettingTimeouts.current[key]) clearTimeout(saveSettingTimeouts.current[key]);
    saveSettingTimeouts.current[key] = setTimeout(async () => {
      try {
        await updateSettingRef.current({ key, value });
        uiNotify.success('تم حفظ الإعداد');
      } catch (err) {
        logger.error('خطأ في حفظ الإعداد:', err instanceof Error ? err.message : err);
        uiNotify.error('خطأ في حفظ الإعداد');
      }
    }, 500);
  }, [updateSettingRef]);

  const handleAdminPercentChange = useCallback((val: string) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      uiNotify.error('نسبة الناظر يجب أن تكون رقماً بين 0 و 100');
      return;
    }
    updateOverride('adminPercent', num);
    saveSetting('admin_share_percentage', val);
  }, [updateOverride, saveSetting]);

  const handleWaqifPercentChange = useCallback((val: string) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      uiNotify.error('نسبة الواقف يجب أن تكون رقماً بين 0 و 100');
      return;
    }
    updateOverride('waqifPercent', num);
    saveSetting('waqif_share_percentage', val);
  }, [updateOverride, saveSetting]);

  const handleFiscalYearChange = useCallback((val: string) => {
    updateOverride('fiscalYear', val);
    saveSetting('fiscal_year', val);
  }, [updateOverride, saveSetting]);

  const adminPctSetting = appSettings.data?.['admin_share_percentage'];
  const waqifPctSetting = appSettings.data?.['waqif_share_percentage'];
  const usingFallbackPct =
    adminPctSetting === null || adminPctSetting === undefined ||
    waqifPctSetting === null || waqifPctSetting === undefined;

  return {
    adminPercent: resolved.adminPercent,
    waqifPercent: resolved.waqifPercent,
    zakatAmount: resolved.zakatAmount,
    waqfCorpusManual: resolved.waqfCorpusManual,
    waqfCorpusPrevious: resolved.waqfCorpusPrevious,
    manualVat: resolved.manualVat,
    manualDistributions: resolved.manualDistributions,
    fiscalYear: resolved.fiscalYear,
    usingFallbackPct,
    currentAccount,
    setWaqfCorpusPrevious,
    setManualVat,
    setZakatAmount,
    setWaqfCorpusManual,
    setManualDistributions,
    handleAdminPercentChange,
    handleWaqifPercentChange,
    handleFiscalYearChange,
  };
}
