/**
 * هوك حفظ بيانات الوقف (شعار + حقول) — مستخرج من WaqfInfoEditDialog.
 * استدعاءات Supabase مفصولة في `lib/services/settingsAssetsService`
 * (قاعدة HooksLayering — لا supabase مباشرة في hooks/page).
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import { SAVE_MESSAGES } from '@/lib/messages';
import { settingsAssetsService } from '@/lib/services/settingsAssetsService';

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
        const ext = settingsAssetsService.pickExt(logoFile.name);
        logoUrl = await settingsAssetsService.uploadAsset(logoFile, `logo.${ext}`);
      }

      await settingsAssetsService.setSetting('waqf_logo_url', logoUrl);

      for (const field of fields) {
        const value = (formData[field.key] || '').trim();
        if (value.length > 500) {
          uiNotify.error(`الحقل "${field.label}" طويل جداً`);
          setSaving(false);
          return;
        }
        await settingsAssetsService.setSetting(field.key, value);
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
