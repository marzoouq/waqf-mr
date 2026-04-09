/**
 * هوك جلب شهادات ZATCA عبر العرض الآمن (بدون مفاتيح خاصة)
 */
import { useQuery } from '@tanstack/react-query';
import { fromView } from '@/integrations/supabase/viewHelper';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';

export interface ZatcaCertificateSafe {
  id: string;
  certificate_type: string;
  is_active: boolean | null;
  request_id: string | null;
  created_at: string | null;
  expires_at: string | null;
}

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
