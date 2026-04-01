/**
 * هوك عدّاد الرسائل غير المقروءة — مفصول من useMessaging
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useCallback, useRef } from 'react';
import { useBfcacheSafeChannel } from '@/hooks/ui/useBfcacheSafeChannel';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

export interface UnreadCounts { chat: number; support: number; broadcast: number; total: number }

export const useUnreadCounts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async (): Promise<UnreadCounts> => {
      if (!user) return { chat: 0, support: 0, broadcast: 0, total: 0 };
      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('id, type');
      if (convErr) throw convErr;
      if (!convs?.length) return { chat: 0, support: 0, broadcast: 0, total: 0 };

      const convIds = convs.map(c => c.id);
      const { data: unreadMsgs, error: detailErr } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('is_read', false)
        .neq('sender_id', user.id)
        .limit(500);
      if (detailErr) throw detailErr;

      const convTypeMap = new Map(convs.map(c => [c.id, c.type]));
      const counts: UnreadCounts = { chat: 0, support: 0, broadcast: 0, total: 0 };
      for (const msg of (unreadMsgs || [])) {
        const type = convTypeMap.get(msg.conversation_id) as keyof Omit<UnreadCounts, 'total'> | undefined;
        if (type && type in counts) {
          counts[type]++;
        }
        counts.total++;
      }
      return counts;
    },
    enabled: !!user,
    staleTime: STALE_MESSAGING,
  });

  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  const unreadSubscribeFn = useCallback((channel: import('@supabase/supabase-js').RealtimeChannel) => {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
      queryClientRef.current.invalidateQueries({ queryKey: ['unread-counts'] });
    });
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
      queryClientRef.current.invalidateQueries({ queryKey: ['unread-counts'] });
    });
  }, []);

  useBfcacheSafeChannel(
    `unread-counts-${user?.id ?? 'none'}`,
    unreadSubscribeFn,
    !!user,
  );

  return query;
};
