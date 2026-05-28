/**
 * useAppSettingsWrite — mutations كتابة إعدادات التطبيق
 *
 * مستخرج من useAppSettings.ts ضمن موجة P3 الختامية. يُجمَّع مع
 * useAppSettingsRead في `useAppSettings` (الـ facade) للحفاظ على API الموحد.
 *
 * يوفر:
 *  - updateSetting: حفظ مفتاح واحد
 *  - updateSettingsBatch: حفظ دفعة مفاتيح
 *  - getJsonSetting: قراءة قيمة JSON مع cache
 *  - updateJsonSetting: حفظ قيمة JSON + toast نجاح
 *  - invalidateCategories: إبطال انتقائي حسب الفئة + legacy key
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import { getCategoryFromKey } from './appSettingsUtils';
import { jsonSettingCache } from './useAppSettingsRead';
import { appSettingsService } from '@/lib/services/appSettingsService';

export const useAppSettingsWrite = (data: Record<string, string> | undefined) => {
  const queryClient = useQueryClient();

  /** يبطل الفئة المعنية + legacy key للتوافق */
  const invalidateCategories = (keys: string[]) => {
    const categories = new Set(keys.map(getCategoryFromKey));
    categories.forEach((cat) => {
      queryClient.invalidateQueries({ queryKey: ['app-settings', cat] });
    });
    queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
  };

  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      appSettingsService.upsertOne(key, value),
    onSuccess: (key) => { invalidateCategories([key]); },
    onError: () => { uiNotify.error('حدث خطأ أثناء حفظ الإعداد'); },
  });

  const updateSettingsBatch = useMutation({
    mutationFn: (rows: Array<{ key: string; value: string; updated_at?: string }>) =>
      appSettingsService.upsertBatch(rows),
    onSuccess: (keys) => { invalidateCategories(keys); },
    onError: () => { uiNotify.error('حدث خطأ أثناء حفظ الإعدادات'); },
  });

  const getJsonSetting = <T>(key: string, fallback: T): T => {
    const raw = data?.[key];
    if (raw === undefined || raw === null) return fallback;

    const cached = jsonSettingCache.get(key);
    if (cached && cached.raw === raw) return cached.parsed as T;

    try {
      const parsed = JSON.parse(raw) as T;
      jsonSettingCache.set(key, { raw, parsed });
      return parsed;
    } catch {
      return fallback;
    }
  };

  const updateJsonSetting = async (key: string, value: object) => {
    try {
      await updateSetting.mutateAsync({ key, value: JSON.stringify(value) });
      uiNotify.success('تم حفظ الإعدادات بنجاح');
    } catch {
      // onError في useMutation يتكفل بعرض الخطأ — منع double toast
    }
  };

  return { updateSetting, updateSettingsBatch, getJsonSetting, updateJsonSetting };
};
