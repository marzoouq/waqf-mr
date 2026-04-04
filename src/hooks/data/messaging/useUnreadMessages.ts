/**
 * هوك لعد الرسائل غير المقروءة للمستخدم الحالي.
 * يعتمد على Realtime invalidation بدلاً من polling.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

export const useUnreadMessages = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-messages-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    staleTime: STALE_MESSAGING,
    retry: false,
  });
};
