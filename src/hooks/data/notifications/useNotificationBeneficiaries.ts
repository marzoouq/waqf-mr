/**
 * هوك جلب قائمة المستفيدين لإرسال الإشعارات الجماعية
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NotificationBeneficiary {
  id: string;
  name?: string;
  user_id?: string;
}

export const useNotificationBeneficiaries = () => {
  return useQuery({
    queryKey: ['beneficiaries', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('id, name, user_id')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data as NotificationBeneficiary[]) || [];
    },
  });
};
