/**
 * هوك جلب شهادات ZATCA
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useZatcaCertificates = () => {
  return useQuery({
    queryKey: ['zatca-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zatca_certificates')
        .select('id, certificate_type, is_active, request_id, created_at, expires_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};
