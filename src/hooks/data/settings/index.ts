export { useAppSettings, useSetting, useSettingsCategory, updateNotificationPrefs, useWaqfInfo, getCategoryFromKey } from './app/useAppSettings';
export type { WaqfInfo, SettingsCategory } from './app/useAppSettings';
export { usePdfWaqfInfo } from './waqf/usePdfWaqfInfo';
export { useRegistrationEnabled } from './permissions/useRegistrationEnabled';
export { useWaqfInfoSave } from './waqf/useWaqfInfoSave';
// useLogoUpload moved to @/hooks/page/admin/settings/useLogoUpload (UI state + toasts)
export { useBannerSettings, BANNER_SETTINGS_KEY } from './appearance/useBannerSettings';
export type { UseBannerSettingsResult } from './appearance/useBannerSettings';
export { useAppearanceSettings, DEFAULT_APPEARANCE_SETTINGS, APPEARANCE_SETTINGS_KEY } from './appearance/useAppearanceSettings';
export type { AppearanceSettings, UseAppearanceSettingsResult } from './appearance/useAppearanceSettings';
export { useBeneficiaryWidgets, BENEFICIARY_WIDGETS_KEY } from './notifications/useBeneficiaryWidgets';
export type { UseBeneficiaryWidgetsResult } from './notifications/useBeneficiaryWidgets';
