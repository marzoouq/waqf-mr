import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STALE_SETTINGS } from '@/lib/queryStaleTime';

const jsonSettingCache = new Map<string, { raw: string; parsed: unknown }>();

export interface WaqfInfo {
  waqf_name: string;
  waqf_founder: string;
  waqf_admin: string;
  waqf_deed_number: string;
  waqf_deed_date: string;
  waqf_nazara_number: string;
  waqf_nazara_date: string;
  waqf_court: string;
  waqf_logo_url: string;
  vat_registration_number: string;
}

export const useAppSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['app-settings-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('key, value');
      if (error) throw error;
      const settings: Record<string, string> = {};
      data?.forEach((row) => { settings[row.key] = row.value; });
      return settings;
    },
    staleTime: STALE_SETTINGS,
    retry: 2,
    retryDelay: 1500,
    gcTime: 1000 * 60 * 30,
    placeholderData: {} as Record<string, string>,
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حفظ الإعداد');
    },
  });

  const updateSettingsBatch = useMutation({
    mutationFn: async (rows: Array<{ key: string; value: string; updated_at?: string }>) => {
      const payload = rows.map((row) => ({
        key: row.key,
        value: row.value,
        updated_at: row.updated_at ?? new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('app_settings')
        .upsert(payload, { onConflict: 'key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    },
  });

  const getJsonSetting = <T>(key: string, fallback: T): T => {
    const raw = query.data?.[key];

    if (raw === undefined || raw === null) {
      return fallback;
    }

    const cached = jsonSettingCache.get(key);
    if (cached && cached.raw === raw) {
      return cached.parsed as T;
    }

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
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch {
      // onError في useMutation يتكفل بعرض الخطأ — منع double toast
    }
  };

  return { ...query, updateSetting, updateSettingsBatch, getJsonSetting, updateJsonSetting };
};

/**
 * #50/#60: هوك مُحسَّن لجلب إعداد واحد فقط — يمنع re-renders غير ضرورية
 * عبر select في useQuery الذي يُقارن القيمة المُرجعة بالمرجعية
 */
export const useSetting = (key: string, fallback = ''): string => {
  const { data } = useQuery({
    queryKey: ['app-settings-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('key, value');
      if (error) throw error;
      const settings: Record<string, string> = {};
      data?.forEach((row) => { settings[row.key] = row.value; });
      return settings;
    },
    staleTime: STALE_SETTINGS,
    gcTime: 1000 * 60 * 30,
    select: (settings) => settings[key] ?? fallback,
  });
  return data ?? fallback;
};

/**
 * #46: تحديث التفضيلات مع إطلاق حدث مخصص للنافذة الحالية
 */
export const updateNotificationPrefs = (prefs: Record<string, boolean>) => {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_PREFS, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent('notif-prefs-changed'));
  } catch { /* silent */ }
};

export const useWaqfInfo = () => {
  const { data: settings, isLoading, error } = useAppSettings();

  const info: WaqfInfo = {
    waqf_name: settings?.waqf_name || '',
    waqf_founder: settings?.waqf_founder || '',
    waqf_admin: settings?.waqf_admin || '',
    waqf_deed_number: settings?.waqf_deed_number || '',
    waqf_deed_date: settings?.waqf_deed_date || '',
    waqf_nazara_number: settings?.waqf_nazara_number || '',
    waqf_nazara_date: settings?.waqf_nazara_date || '',
    waqf_court: settings?.waqf_court || '',
    waqf_logo_url: settings?.waqf_logo_url || '',
    vat_registration_number: settings?.vat_registration_number || '',
  };

  return { data: info, isLoading, error };
};
