/**
 * useAppSettingsRead — استعلامات قراءة إعدادات التطبيق
 *
 * مستخرج من useAppSettings.ts ضمن موجة P3 الختامية:
 *  - settingsQueryFn: استعلام قاعدة البيانات الخام (مُعاد استخدامه)
 *  - useSettingsCategory: قراءة فئة محددة (zatca/banner/general)
 *  - useSetting: قراءة مفتاح واحد مع select لتقليل re-renders
 *
 * Cache المُشترَك:
 *  - jsonSettingCache: ذاكرة مؤقتة لقيم JSON المُحلَّلة لتفادي JSON.parse المتكرر
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_SETTINGS } from '@/lib/queryStaleTime';
import { getCategoryFromKey, type SettingsCategory } from './appSettingsUtils';

/** ذاكرة مؤقتة لقيم JSON المُحلَّلة — مُشتركة بين read/write */
export const jsonSettingCache = new Map<string, { raw: string; parsed: unknown }>();

export const settingsQueryFn = async () => {
  const { data, error } = await supabase.from('app_settings').select('key, value');
  if (error) throw error;
  const settings: Record<string, string> = {};
  data?.forEach((row) => { settings[row.key] = row.value; });
  return settings;
};

/**
 * هوك مُحسَّن يقرأ فئة محددة فقط — يستخدم نفس استعلام `app-settings-all`
 * مع query key مختلف للسماح بإبطال انتقائي.
 */
export const useSettingsCategory = (category: SettingsCategory) => {
  return useQuery({
    queryKey: ['app-settings', category],
    queryFn: settingsQueryFn,
    staleTime: STALE_SETTINGS,
    gcTime: 1000 * 60 * 30,
    select: (settings) => {
      const filtered: Record<string, string> = {};
      for (const [key, value] of Object.entries(settings)) {
        if (getCategoryFromKey(key) === category) {
          filtered[key] = value;
        }
      }
      return filtered;
    },
  });
};

/**
 * #50/#60: هوك مُحسَّن لجلب إعداد واحد فقط — يمنع re-renders غير ضرورية
 * عبر select في useQuery الذي يُقارن القيمة المُرجعة بالمرجعية
 */
export const useSetting = (key: string, fallback = ''): string => {
  const { data } = useQuery({
    queryKey: ['app-settings-all'],
    queryFn: settingsQueryFn,
    staleTime: STALE_SETTINGS,
    gcTime: 1000 * 60 * 30,
    select: (settings) => settings[key] ?? fallback,
  });
  return data ?? fallback;
};
