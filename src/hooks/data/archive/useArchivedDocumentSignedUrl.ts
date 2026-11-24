/**
 * جلب وثيقة الأرشيف مباشرة بجلسة المستخدم (تُفحص الصلاحية لحظة الطلب عبر can_access_file)
 * وتحويلها لرابط محلي (blob) — لا يُنشأ أي رابط موقّع قابل للمشاركة يبقى صالحًا بعد سحب الصلاحية.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ARCHIVE_FILE_LIMITS } from '@/types/archive';

export interface SignedUrlInput {
  storagePath: string;
  /** إن وُجد، يُحفّز التنزيل بهذا الاسم بدل المعاينة */
  downloadAs?: string;
}

export function useArchivedDocumentSignedUrl() {
  return useMutation({
    mutationFn: async ({ storagePath }: SignedUrlInput): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(ARCHIVE_FILE_LIMITS.BUCKET)
        .download(storagePath);
      if (error || !data) throw error ?? new Error('تعذّر فتح الوثيقة');
      return URL.createObjectURL(data);
    },
  });
}
