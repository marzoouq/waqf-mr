/**
 * هوك لحفظ بيانات الوقف (تحميل الشعار + تحديث الإعدادات)
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface WaqfField {
  key: string;
  label: string;
}

export function useSaveWaqfInfo(onSuccess?: () => void) {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const save = async (
    fields: readonly WaqfField[],
    formData: Record<string, string>,
    logoFile: File | null,
    currentLogoUrl?: string,
  ) => {
    setSaving(true);
    try {
      let logoUrl = currentLogoUrl || '';
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('waqf-assets')
          .upload(path, logoFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('waqf-assets').getPublicUrl(path);
        logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      await supabase
        .from('app_settings')
        .upsert({ key: 'waqf_logo_url', value: logoUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      for (const field of fields) {
        const value = (formData[field.key] || '').trim();
        if (value.length > 500) {
          toast.error(`الحقل "${field.label}" طويل جداً`);
          setSaving(false);
          return;
        }
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: field.key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      toast.success('تم حفظ بيانات الوقف بنجاح');
      onSuccess?.();
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return { save, saving };
}
