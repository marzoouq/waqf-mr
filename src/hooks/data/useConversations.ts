/**
 * هوك جلب المحادثات — مفصول من useMessaging
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useCallback, useRef } from 'react';
import { Conversation } from '@/types/database';
import { useBfcacheSafeChannel } from '@/hooks/ui/useBfcacheSafeChannel';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';

export const useConversations = (type?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', type],
    queryFn: async (): Promise<Conversation[]> => {
      let q = supabase.from('conversations').select('id, type, subject, status, created_by, participant_id, created_at, updated_at').order('updated_at', { ascending: false }).limit(100);
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Conversation[];
    },
    enabled: !!user,
    staleTime: STALE_MESSAGING,
  });

  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  const convSubscribeFn = useCallback((channel: import('@supabase/supabase-js').RealtimeChannel) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
      queryClientRef.current.invalidateQueries({ queryKey: ['conversations'] });
    });
  }, []);

  useBfcacheSafeChannel(
    `chat-conv-${user?.id ?? 'none'}-${type || 'all'}`,
    convSubscribeFn,
    !!user,
  );

  return query;
};
