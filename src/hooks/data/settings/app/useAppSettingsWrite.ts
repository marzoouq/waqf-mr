/**
 * useAppSettingsWrite — mutations كتابة إعدادات التطبيق
 *
 * `updateSetting` و `updateSettingsBatch` بلا toast — المستهلِك يضيفها.
 * `updateJsonSetting` يحتفظ بـ toast نجاح/فشل (SAVE_MESSAGES) لأنه
 * facade عالي المستوى مُستخدَم من 15+ صفحة تعتمد على هذه الدلالة.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import { SAVE_MESSAGES } from '@/lib/messages';
import { getCategoryFromKey } from '@/hooks/data/settings/app/appSettingsUtils';
import { jsonSettingCache } from '@/hooks/data/settings/app/useAppSettingsRead';
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
  });

  const updateSettingsBatch = useMutation({
    mutationFn: (rows: Array<{ key: string; value: string; updated_at?: string }>) =>
      appSettingsService.upsertBatch(rows),
    onSuccess: (keys) => { invalidateCategories(keys); },
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

  /** يحفظ قيمة JSON. يُظهر SAVE_MESSAGES.saveSuccess/saveError تلقائياً. */
  const updateJsonSetting = async (key: string, value: object) => {
    try {
      await updateSetting.mutateAsync({ key, value: JSON.stringify(value) });
      uiNotify.success(SAVE_MESSAGES.saveSuccess);
    } catch {
      uiNotify.error(SAVE_MESSAGES.saveError);
    }
  };

  return { updateSetting, updateSettingsBatch, getJsonSetting, updateJsonSetting };
};
