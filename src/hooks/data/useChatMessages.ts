/**
 * هوك جلب رسائل المحادثة مع pagination و auto-mark-read — مفصول من useMessaging
 */
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Message } from '@/types/database';
import { logger } from '@/lib/logger';
import { useBfcacheSafeChannel } from '@/hooks/ui/useBfcacheSafeChannel';
import { STALE_LIVE } from '@/lib/queryStaleTime';

const MESSAGES_PAGE_SIZE = 50;

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam = 0 }): Promise<Message[]> => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, is_read, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + MESSAGES_PAGE_SIZE - 1);
      if (error) throw error;
      return ((data || []) as Message[]).reverse();
    },
    initialPageParam: 0,
    getNextPageParam: (_lastPage, allPages) => {
      const lastPage = allPages[allPages.length - 1];
      if (!lastPage || lastPage.length < MESSAGES_PAGE_SIZE) return undefined;
      return allPages.reduce((sum, page) => sum + page.length, 0);
    },
    enabled: !!user && !!conversationId,
    staleTime: STALE_LIVE,
  });

  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  const msgSubscribeFn = useCallback((channel: import('@supabase/supabase-js').RealtimeChannel) => {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => {
      queryClientRef.current.invalidateQueries({ queryKey: ['messages', conversationId] });
    });
  }, [conversationId]);

  useBfcacheSafeChannel(
    `chat-msg-${conversationId ?? 'none'}`,
    msgSubscribeFn,
    !!user && !!conversationId,
  );

  const allMessages = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  // تعليم الرسائل غير المقروءة كمقروءة تلقائياً
  const markedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!conversationId || !user || allMessages.length === 0) return;
    if (markedRef.current === conversationId) return;
    const unreadIds = allMessages
      .filter(m => !m.is_read && m.sender_id !== user.id)
      .map(m => m.id);
    if (unreadIds.length === 0) return;
    markedRef.current = conversationId;
    supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', unreadIds)
      .then(({ error }) => {
        if (error) {
          logger.warn('فشل تعليم الرسائل كمقروءة:', error.message);
          markedRef.current = null;
        } else {
          queryClientRef.current.invalidateQueries({ queryKey: ['unread-counts'] });
        }
      });
  }, [conversationId, user, allMessages]);

  return {
    ...query,
    data: allMessages,
    hasMore: query.hasNextPage ?? false,
    loadMore: query.fetchNextPage,
    isLoadingMore: query.isFetchingNextPage,
  };
};
