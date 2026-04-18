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
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { getCategoryFromKey } from './appSettingsUtils';
import { jsonSettingCache } from './useAppSettingsRead';

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
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      return key;
    },
    onSuccess: (key) => { invalidateCategories([key]); },
    onError: () => { defaultNotify.error('حدث خطأ أثناء حفظ الإعداد'); },
  });

  const updateSettingsBatch = useMutation({
    mutationFn: async (rows: Array<{ key: string; value: string; updated_at?: string }>) => {
      const payload = rows.map((row) => ({
        key: row.key,
        value: row.value,
        updated_at: row.updated_at ?? new Date().toISOString(),
      }));
      const { error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'key' });
      if (error) throw error;
      return rows.map((r) => r.key);
    },
    onSuccess: (keys) => { invalidateCategories(keys); },
    onError: () => { defaultNotify.error('حدث خطأ أثناء حفظ الإعدادات'); },
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
      defaultNotify.success('تم حفظ الإعدادات بنجاح');
    } catch {
      // onError في useMutation يتكفل بعرض الخطأ — منع double toast
    }
  };

  return { updateSetting, updateSettingsBatch, getJsonSetting, updateJsonSetting };
};
