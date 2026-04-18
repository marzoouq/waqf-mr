/**
 * useAppSettings — facade مُوحَّد للقراءة + الكتابة
 *
 * بعد موجة P3 الختامية: تم تقسيم الملف إلى:
 *  - appSettingsUtils.ts → helpers خالصة (categories, prefs)
 *  - useAppSettingsRead.ts → useQuery hooks (settingsQueryFn, useSetting, useSettingsCategory)
 *  - useAppSettingsWrite.ts → mutations (updateSetting, updateSettingsBatch, getJsonSetting, updateJsonSetting)
 *  - useWaqfInfo.ts → هوك معلومات الوقف
 *
 * هذا الملف يبقى كـ barrel/facade للحفاظ على API السطحي والتوافق الخلفي.
 */
import { useQuery } from '@tanstack/react-query';
import { STALE_STATIC } from '@/lib/queryStaleTime';
import { settingsQueryFn } from './useAppSettingsRead';
import { useAppSettingsWrite } from './useAppSettingsWrite';

export const useAppSettings = () => {
  const query = useQuery({
    queryKey: ['app-settings-all'],
    queryFn: settingsQueryFn,
    staleTime: STALE_SETTINGS,
    retry: 2,
    retryDelay: 1500,
    gcTime: 1000 * 60 * 30,
    placeholderData: {} as Record<string, string>,
  });

  const writes = useAppSettingsWrite(query.data);
  return { ...query, ...writes };
};

// Re-exports للتوافق الخلفي مع الاستيرادات القائمة
export { useSetting, useSettingsCategory } from './useAppSettingsRead';
export { useWaqfInfo, type WaqfInfo } from './useWaqfInfo';
export { getCategoryFromKey, updateNotificationPrefs, type SettingsCategory } from './appSettingsUtils';
