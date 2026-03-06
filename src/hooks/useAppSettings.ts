import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: 1500,
    gcTime: 1000 * 60 * 30,
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

  const getJsonSetting = <T>(key: string, fallback: T): T => {
    try {
      return query.data?.[key] ? JSON.parse(query.data[key]) : fallback;
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

  return { ...query, updateSetting, getJsonSetting, updateJsonSetting };
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
  };

  return { data: info, isLoading, error };
};
