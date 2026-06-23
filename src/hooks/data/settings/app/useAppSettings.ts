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
import { settingsQueryFn } from '@/hooks/data/settings/app/useAppSettingsRead';
import { useAppSettingsWrite } from '@/hooks/data/settings/app/useAppSettingsWrite';
import { appSettingsKeys } from '@/lib/queryKeys/appSettingsKeys';

export const useAppSettings = () => {
  const query = useQuery({
    queryKey: appSettingsKeys.all(),
    queryFn: settingsQueryFn,
    staleTime: STALE_STATIC,
    retry: 2,
    retryDelay: 1500,
    gcTime: 1000 * 60 * 30,
    placeholderData: {} as Record<string, string>,
  });

  const writes = useAppSettingsWrite(query.data);
  // ملاحظة: لا نستخدم {...query} لأن سكب UseQueryResult يكسر تتبّع QueryObserver
  // ويُسبّب الخطأ "The provided callback is no longer runnable" + re-renders زائدة.
  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    ...writes,
  };
};

// Re-exports للتوافق الخلفي مع الاستيرادات القائمة
export { useSetting, useSettingsCategory } from '@/hooks/data/settings/app/useAppSettingsRead';
export { useWaqfInfo, type WaqfInfo } from '@/hooks/data/settings/waqf/useWaqfInfo';
export { getCategoryFromKey, updateNotificationPrefs, type SettingsCategory } from '@/hooks/data/settings/app/appSettingsUtils';
