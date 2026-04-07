/**
 * هوك جلب شهادات ZATCA عبر العرض الآمن (بدون مفاتيح خاصة)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zatca_certificates_safe' as any)
        .select('id, certificate_type, is_active, request_id, created_at, expires_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ZatcaCertificateSafe[];
    },
  });
};
