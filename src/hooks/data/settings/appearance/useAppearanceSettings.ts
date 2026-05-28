/**
 * useAppearanceSettings — hook موحَّد لقراءة وحفظ إعدادات المظهر
 *
 * يُغلِّف قراءة `appearance_settings` (اسم النظام، لاحقاً ألوان...) مع
 * memoization للمرجع. ألوان الثيم تُدار بمعزل عبر `ThemeColorPicker`/`lib/theme`.
 *
 * المستهلكون: `AppearanceTab`.
 */
import { useMemo } from 'react';
import { useAppSettings } from './useAppSettings';

export const APPEARANCE_SETTINGS_KEY = 'appearance_settings';

export interface AppearanceSettings {
  system_name: string;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  system_name: 'إدارة الوقف',
};

export interface UseAppearanceSettingsResult {
  settings: AppearanceSettings;
  isLoading: boolean;
  save: (patch: Partial<AppearanceSettings>) => Promise<void>;
}

export const useAppearanceSettings = (): UseAppearanceSettingsResult => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();

  const raw = getJsonSetting<AppearanceSettings>(APPEARANCE_SETTINGS_KEY, DEFAULT_APPEARANCE_SETTINGS);

  const rawKey = JSON.stringify(raw);
  const settings = useMemo<AppearanceSettings>(
    () => ({ ...DEFAULT_APPEARANCE_SETTINGS, ...(JSON.parse(rawKey) as AppearanceSettings) }),
    [rawKey],
  );

  const save = async (patch: Partial<AppearanceSettings>) => {
    await updateJsonSetting(APPEARANCE_SETTINGS_KEY, { ...settings, ...patch });
  };

  return { settings, isLoading, save };
};
