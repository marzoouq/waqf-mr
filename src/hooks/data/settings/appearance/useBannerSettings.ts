/**
 * useBannerSettings — hook موحَّد لقراءة وحفظ إعدادات شريط التنبيه
 *
 * يُغلِّف قراءة `beta_banner_settings` من `app_settings` ودمجها مع
 * `DEFAULT_BANNER_SETTINGS`، مع memoization للمرجع لمنع re-renders.
 *
 * المستهلكون: `BetaBanner`, `BannerSettingsTab`.
 */
import { useMemo } from 'react';
import { useAppSettings } from './useAppSettings';
import { DEFAULT_BANNER_SETTINGS, type BannerSettings } from '@/constants';

export const BANNER_SETTINGS_KEY = 'beta_banner_settings';

export interface UseBannerSettingsResult {
  settings: BannerSettings;
  isLoading: boolean;
  save: (patch: Partial<BannerSettings>) => Promise<void>;
}

export const useBannerSettings = (): UseBannerSettingsResult => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();

  const raw = getJsonSetting<BannerSettings>(BANNER_SETTINGS_KEY, DEFAULT_BANNER_SETTINGS);

  // مفتاح JSON ثابت يضمن استقرار المرجع طالما المحتوى لم يتغير
  const rawKey = JSON.stringify(raw);
  const settings = useMemo<BannerSettings>(
    () => ({ ...DEFAULT_BANNER_SETTINGS, ...(JSON.parse(rawKey) as BannerSettings) }),
    [rawKey],
  );

  const save = async (patch: Partial<BannerSettings>) => {
    await updateJsonSetting(BANNER_SETTINGS_KEY, { ...settings, ...patch });
  };

  return { settings, isLoading, save };
};
