import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      queryClient.invalidateQueries({ queryKey: ['waqf-info'] });
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
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  return { ...query, updateSetting, getJsonSetting, updateJsonSetting };
};
