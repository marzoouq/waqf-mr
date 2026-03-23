/**
 * هوك لعد الرسائل غير المقروءة للمستخدم الحالي.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadMessages = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-messages-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      // عدد الرسائل غير المقروءة في محادثات المستخدم (التي لم يرسلها هو)
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000, // تحديث كل دقيقة
  });
};
