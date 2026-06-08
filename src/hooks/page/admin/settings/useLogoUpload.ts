/**
 * Page hook لرفع/إزالة شعار التطبيق — يدير state واجهة وتنبيهات.
 * استدعاءات Supabase مفصولة في `lib/services/settingsAssetsService`
 * (قاعدة HooksLayering — لا supabase مباشرة في hooks/page).
 */
import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import { resizeImage } from '@/utils/image/resizeImage';
import { settingsAssetsService } from '@/lib/services/settingsAssetsService';
import { appSettingsKeys } from '@/lib/queryKeys/appSettingsKeys';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 2 * 1024 * 1024;

interface UseLogoUploadParams {
  settingKey: string;
  storagePath: string;
  currentUrl: string;
}

export const useLogoUpload = ({ settingKey, storagePath, currentUrl }: UseLogoUploadParams) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(currentUrl);
  const [saving, setSaving] = useState(false);

  // مزامنة مع التغييرات الخارجية — adjust state during render (React docs pattern)
  const [prevUrl, setPrevUrl] = useState(currentUrl);
  if (currentUrl !== prevUrl && !saving) {
    setPrevUrl(currentUrl);
    setPreview(currentUrl);
  }

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: appSettingsKeys.byCategory('general') });
    await queryClient.invalidateQueries({ queryKey: appSettingsKeys.prefixes.all });
  }, [queryClient]);

  const handleSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      uiNotify.error('نوع الملف غير مسموح. الأنواع المسموحة: JPG, PNG, WEBP, SVG');
      return;
    }
    if (file.size > MAX_SIZE) {
      uiNotify.error('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }

    setSaving(true);
    try {
      const result = await resizeImage(file, 256, 0.85);
      const resizedFile = new File([result.blob], file.name, { type: result.blob.type });
      const ext = settingsAssetsService.pickExt(file.name);
      const path = `${storagePath}.${ext}`;

      const logoUrl = await settingsAssetsService.uploadAsset(resizedFile, path);
      await settingsAssetsService.setSetting(settingKey, logoUrl);

      await invalidate();
      setPreview(logoUrl);
      uiNotify.success('تم رفع الشعار بنجاح');
    } catch {
      uiNotify.error('حدث خطأ أثناء رفع الشعار');
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [settingKey, storagePath, invalidate]);

  const handleRemove = useCallback(async () => {
    setSaving(true);
    try {
      await settingsAssetsService.setSetting(settingKey, '');
      await invalidate();
      setPreview('');
      uiNotify.success('تم إزالة الشعار');
    } catch {
      uiNotify.error('حدث خطأ أثناء الإزالة');
    } finally {
      setSaving(false);
    }
  }, [settingKey, invalidate]);

  return { fileInputRef, preview, saving, handleSelect, handleRemove };
};
