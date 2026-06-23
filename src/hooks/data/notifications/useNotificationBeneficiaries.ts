/**
 * هوك جلب قائمة المستفيدين لإرسال الإشعارات الجماعية
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { beneficiariesKeys } from '@/lib/queryKeys/beneficiariesKeys';

interface NotificationBeneficiary {
  id: string;
  name?: string;
  user_id?: string;
}

export const useNotificationBeneficiaries = () => {
  return useQuery({
    // مفتاح مستقل تحت بادئة beneficiaries-safe — لا يتداخل مع invalidation الخاص بـ CRUD
    queryKey: beneficiariesKeys.notificationRecipients(),
    queryFn: async ({ signal }) => {
      // F-A2: استخدام beneficiaries_safe (view آمن) بدل جدول PII الخام.
      const { data, error } = await supabase
        .from('beneficiaries_safe')
        .select('id, name, user_id')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data as NotificationBeneficiary[]) || [];
    },
  });
};
