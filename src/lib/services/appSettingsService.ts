/**
 * appSettingsService — طبقة بنية تحتية لقراءة/كتابة جدول `app_settings`.
 * مستخرج من useAppSettingsRead/Write ضمن M2.3.
 */
import { supabase } from '@/integrations/supabase/client';

export const appSettingsService = {
  /** قراءة كل الإعدادات إلى Record<key, value> */
  async listAll(): Promise<Record<string, string>> {
    const { data, error } = await supabase.from('app_settings').select('key, value');
    if (error) throw error;
    const settings: Record<string, string> = {};
    data?.forEach((row) => { settings[row.key] = row.value; });
    return settings;
  },

  /** قراءة مجموعة محددة من المفاتيح */
  async listByKeys(keys: string[]): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', keys);
    if (error) throw error;
    const map: Record<string, string> = {};
    (data || []).forEach((s) => { map[s.key] = s.value; });
    return map;
  },

  /** Upsert مفتاح واحد */
  async upsertOne(key: string, value: string): Promise<string> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    return key;
  },

  /** Upsert دفعة مفاتيح */
  async upsertBatch(rows: Array<{ key: string; value: string; updated_at?: string }>): Promise<string[]> {
    const payload = rows.map((row) => ({
      key: row.key,
      value: row.value,
      updated_at: row.updated_at ?? new Date().toISOString(),
    }));
    const { error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'key' });
    if (error) throw error;
    return rows.map((r) => r.key);
  },
};
