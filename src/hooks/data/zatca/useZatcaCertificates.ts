/**
 * هوك جلب شهادات ZATCA عبر العرض الآمن (بدون مفاتيح خاصة)
 */
import { useQuery } from '@tanstack/react-query';
import { fromView } from '@/integrations/supabase/viewHelper';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import type { ZatcaCertificateSafe } from '@/types/zatca';

// إعادة تصدير للتوافق مع الاستيرادات القائمة من نفس الملف
export type { ZatcaCertificateSafe } from '@/types/zatca';

export const useZatcaCertificates = () => {
  return useQuery<ZatcaCertificateSafe[]>({
    queryKey: ['zatca-certificates'],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      const { data, error } = await fromView('zatca_certificates_safe')
        .select('id, certificate_type, is_active, request_id, created_at, expires_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // fromView → أنواع nullable بالكامل — cast مطلوب
      return (data ?? []) as unknown as ZatcaCertificateSafe[];
    },
  });
};
