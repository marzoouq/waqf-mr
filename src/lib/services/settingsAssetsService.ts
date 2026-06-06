/**
 * settingsAssetsService — رفع/حذف أصول الإعدادات (شعار الوقف وما يماثله)
 * إلى bucket `waqf-assets`، مع كتابة قيمة المفتاح في `app_settings`.
 *
 * الغرض: عزل استدعاءات Supabase عن hooks/page (قاعدة HooksLayering).
 * لا توجد إشعارات هنا — الطبقة المستدعية مسؤولة عن uiNotify.
 */
import { supabase } from '@/integrations/supabase/client';
import { appSettingsService } from './appSettingsService';

const BUCKET = 'waqf-assets';

export const settingsAssetsService = {
  /** رفع ملف إلى bucket `waqf-assets` وإرجاع publicUrl مع cache-buster. */
  async uploadAsset(file: File | Blob, path: string): Promise<string> {
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return `${urlData.publicUrl}?t=${Date.now()}`;
  },

  /** اشتقاق امتداد الملف من اسمه (افتراضي png). */
  pickExt(filename: string, fallback = 'png'): string {
    return filename.split('.').pop()?.toLowerCase() || fallback;
  },

  /** كتابة قيمة مفتاح في app_settings — wrapper على appSettingsService. */
  async setSetting(key: string, value: string): Promise<void> {
    await appSettingsService.upsertOne(key, value);
  },
};
