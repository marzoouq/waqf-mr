/**
 * هوك لعد الرسائل غير المقروءة للمستخدم الحالي.
 * يتحدّث مباشرة عبر Realtime عند أي إدراج أو تعليم مقروء.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';
import { messagingKeys } from '@/lib/queryKeys/messagingKeys';
import { useBfcacheSafeChannel } from '@/lib/realtime/bfcacheSafeChannel';
import { useStableRef } from '@/lib/hooks/useStableRef';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const queryClientRef = useStableRef(useQueryClient());

  const subscribeFn = useCallback((channel: RealtimeChannel) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
      queryClientRef.current.invalidateQueries({ queryKey: messagingKeys.unread.prefix });
    });
  }, [queryClientRef]);

  useBfcacheSafeChannel(`unread-msgs-${user?.id ?? 'none'}`, subscribeFn, !!user);

  return useQuery({
    queryKey: messagingKeys.unread.byUser(user?.id),
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
