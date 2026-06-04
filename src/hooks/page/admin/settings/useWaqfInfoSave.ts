/**
 * هوك حفظ بيانات الوقف (شعار + حقول) — مستخرج من WaqfInfoEditDialog.
 * نُقل من hooks/data إلى hooks/page لأنه يحتوي UI state + toasts
 * (راجع mem://conventions/no-toast-in-data-hooks).
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import { SAVE_MESSAGES } from '@/lib/messages';

interface WaqfField {
  key: string;
  label: string;
}

export const useWaqfInfoSave = (onSuccess: () => void) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const saveWaqfInfo = async (
    fields: readonly WaqfField[],
    formData: Record<string, string>,
    logoFile: File | null,
    currentLogoUrl: string | null,
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
          uiNotify.error(`الحقل "${field.label}" طويل جداً`);
          setSaving(false);
          return;
        }
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: field.key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ['app-settings', 'general'] });
      await queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      uiNotify.success('تم حفظ بيانات الوقف بنجاح');
      onSuccess();
    } catch {
      uiNotify.error(SAVE_MESSAGES.saveError);
    } finally {
      setSaving(false);
    }
  };

  return { saving, saveWaqfInfo };
};
