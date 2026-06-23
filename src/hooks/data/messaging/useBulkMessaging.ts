/**
 * هوك بيانات الرسائل الجماعية — استعلام نقي بدون toast.
 * منطق الإرسال + toast نُقل إلى hooks/page/admin/messaging/useBulkMessageSender.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { beneficiariesKeys } from '@/lib/queryKeys/beneficiariesKeys';

export const useBeneficiariesForMessaging = () => {
  return useQuery({
    queryKey: beneficiariesKeys.messagingRecipients(),
    queryFn: async ({ signal: _signal }) => {
      // F-A2: استخدام beneficiaries_safe (view آمن) بدل جدول PII الخام.
      const { data, error } = await supabase
        .from('beneficiaries_safe')
        .select('id, name, user_id')
        .not('user_id', 'is', null)
        .order('name');
      if (error) throw error;
      return (data ?? [])
        .filter((r): r is { id: string; name: string; user_id: string } =>
          !!r.id && !!r.name && !!r.user_id,
        );
    },
  });
};

// useBulkMessageSender متاح مباشرة من '@/hooks/page/admin/messaging/useBulkMessageSender'
