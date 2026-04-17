/**
 * هوك رفع الشعار — يفصل منطق Supabase عن مكون LogoUploadCard
 */
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { defaultNotify } from '@/lib/notify';
import { resizeImage } from '@/utils/image/resizeImage';

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

  // مزامنة مع التغييرات الخارجية
  if (currentUrl !== preview && !saving) {
    setPreview(currentUrl);
  }

  const handleSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      defaultNotify.error('نوع الملف غير مسموح. الأنواع المسموحة: JPG, PNG, WEBP, SVG');
      return;
    }
    if (file.size > MAX_SIZE) {
      defaultNotify.error('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }

    setSaving(true);
    try {
      const result = await resizeImage(file, 256, 0.85);
      const resizedFile = new File([result.blob], file.name, { type: result.blob.type });
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${storagePath}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('waqf-assets')
        .upload(path, resizedFile, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('waqf-assets').getPublicUrl(path);
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase
        .from('app_settings')
        .upsert({ key: settingKey, value: logoUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      // المهمة B — إبطال فئة general + legacy
      await queryClient.invalidateQueries({ queryKey: ['app-settings', 'general'] });
      await queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      setPreview(logoUrl);
      defaultNotify.success('تم رفع الشعار بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء رفع الشعار');
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [settingKey, storagePath, queryClient]);

  const handleRemove = useCallback(async () => {
    setSaving(true);
    try {
      await supabase
        .from('app_settings')
        .upsert({ key: settingKey, value: '', updated_at: new Date().toISOString() }, { onConflict: 'key' });
      await queryClient.invalidateQueries({ queryKey: ['app-settings', 'general'] });
      await queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      setPreview('');
      defaultNotify.success('تم إزالة الشعار');
    } catch {
      defaultNotify.error('حدث خطأ أثناء الإزالة');
    } finally {
      setSaving(false);
    }
  }, [settingKey, queryClient]);

  return { fileInputRef, preview, saving, handleSelect, handleRemove };
};
