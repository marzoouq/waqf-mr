/**
 * useAppSettingsHistory — قراءة سجل تغييرات app_settings من audit_log
 *
 * يجلب آخر التعديلات على إعدادات النظام (آخر 50 افتراضياً)، مع إمكانية
 * تصفية مفتاح محدد. القيم الحساسة محجوبة على مستوى DB عبر
 * `audit_app_settings_trigger` (مفاتيح OTP و PII encryption key).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AppSettingHistoryEntry {
  id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id: string | null;
  created_at: string;
  setting_key: string;
  old_value: string | null;
  new_value: string | null;
}

interface RawRow {
  id: string;
  operation: string;
  user_id: string | null;
  created_at: string;
  old_data: { key?: string; value?: string } | null;
  new_data: { key?: string; value?: string } | null;
}

export const useAppSettingsHistory = (filterKey?: string, limit = 50) => {
  return useQuery({
    queryKey: ['app-settings-history', filterKey ?? '__all__', limit],
    queryFn: async (): Promise<AppSettingHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, operation, user_id, created_at, old_data, new_data')
        .eq('table_name', 'app_settings')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const rows = (data ?? []) as unknown as RawRow[];
      return rows
        .map<AppSettingHistoryEntry>((r) => ({
          id: r.id,
          operation: (r.operation as AppSettingHistoryEntry['operation']) ?? 'UPDATE',
          user_id: r.user_id,
          created_at: r.created_at,
          setting_key: r.new_data?.key ?? r.old_data?.key ?? '—',
          old_value: r.old_data?.value ?? null,
          new_value: r.new_data?.value ?? null,
        }))
        .filter((entry) => !filterKey || entry.setting_key === filterKey);
    },
    staleTime: 30_000,
  });
};
