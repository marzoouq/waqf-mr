/**
 * إنشاء signed URL على الطلب لمعاينة/تنزيل وثيقة. TTL = 60 ثانية.
 * لا نخزّن النتيجة في React state دائم؛ يُستدعى عند فتح المعاينة فقط.
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
    mutationFn: async ({ storagePath, downloadAs }: SignedUrlInput): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(ARCHIVE_FILE_LIMITS.BUCKET)
        .createSignedUrl(storagePath, 60, downloadAs ? { download: downloadAs } : undefined);
      if (error || !data?.signedUrl) throw error ?? new Error('تعذّر إنشاء رابط المعاينة');
      return data.signedUrl;
    },
  });
}
