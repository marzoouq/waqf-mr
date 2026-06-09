import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useCallback, useRef } from 'react';
import { Conversation, Message } from '@/types';
import { enqueueUserNotification } from '@/lib/services';
import { useBfcacheSafeChannel } from '@/lib/realtime/bfcacheSafeChannel';
import { useStableRef } from '@/lib/hooks/useStableRef';
import { STALE_MESSAGING, STALE_LIVE } from '@/lib/queryStaleTime';
import { messagingService, MESSAGES_PAGE_SIZE } from '@/lib/services/messagingService';
import { messagingKeys } from '@/lib/queryKeys/messagingKeys';

export type { Conversation, Message };

export const useConversations = (type?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: messagingKeys.conversations.byType(type),
    queryFn: () => messagingService.listConversations(type),
    enabled: !!user,
    staleTime: STALE_MESSAGING,
  });

  const queryClientRef = useStableRef(queryClient);

  const convSubscribeFn = useCallback((channel: import('@supabase/supabase-js').RealtimeChannel) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
      queryClientRef.current.invalidateQueries({ queryKey: messagingKeys.conversations.prefix });
    });
  }, [queryClientRef]);

  useBfcacheSafeChannel(
    `chat-conv-${user?.id ?? 'none'}-${type || 'all'}`,
    convSubscribeFn,
    !!user,
  );

  return query;
};

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  type Cursor = { created_at: string; id: string } | undefined;

  const query = useInfiniteQuery({
    queryKey: messagingKeys.messages.byConversation(conversationId),
    queryFn: async ({ pageParam }: { pageParam: Cursor }): Promise<Message[]> => {
      if (!conversationId) return [];
      return messagingService.listMessagesPage(conversationId, pageParam);
    },
    initialPageParam: undefined as Cursor,
    getNextPageParam: (_lastPage, allPages) => {
      const oldestPage = allPages[allPages.length - 1];
      if (!oldestPage || oldestPage.length < MESSAGES_PAGE_SIZE) return undefined;
      const oldest = oldestPage[0];
      if (!oldest) return undefined;
      return { created_at: oldest.created_at, id: oldest.id };
    },
    enabled: !!user && !!conversationId,
    staleTime: STALE_LIVE,
  });

  const queryClientRef = useStableRef(queryClient);

  const msgSubscribeFn = useCallback((channel: import('@supabase/supabase-js').RealtimeChannel) => {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => {
      queryClientRef.current.invalidateQueries({ queryKey: messagingKeys.messages.byConversation(conversationId) });
    });
  }, [conversationId, queryClientRef]);

  useBfcacheSafeChannel(
    `chat-msg-${conversationId ?? 'none'}`,
    msgSubscribeFn,
    !!user && !!conversationId,
  );

  const allMessages = query.data?.pages.flat() ?? [];

  return {
    ...query,
    data: allMessages,
    hasMore: query.hasNextPage ?? false,
    loadMore: query.fetchNextPage,
    isLoadingMore: query.isFetchingNextPage,
  };
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  return useMutation({
    mutationFn: async ({ conversationId, content, senderId }: { conversationId: string; content: string; senderId: string }) => {
      const trimmed = content.trim();
      if (!trimmed || trimmed.length > 5000) throw new Error('رسالة غير صالحة');
      await messagingService.insertMessage({
        conversation_id: conversationId,
        sender_id: senderId,
        content: trimmed,
      });
      await messagingService.touchConversation(conversationId);

      // إشعار المستفيد عند إرسال رسالة من المسؤول أو المحاسب
      if (role === 'admin' || role === 'accountant') {
        try {
          const conv = await messagingService.getConversationParticipant(conversationId);
          if (conv?.participant_id) {
            enqueueUserNotification(
              conv.participant_id,
              'رسالة جديدة من ناظر الوقف',
              `لديك رسالة جديدة في محادثة "${conv.subject || 'محادثة'}"`,
              'info',
              '/beneficiary/messages',
            );
          }
        } catch {
          // فشل الإشعار غير حرج
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.messages.byConversation(vars.conversationId) });
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations.prefix });
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const pendingRef = useRef(false);
  return useMutation({
    mutationFn: async ({ type, subject, createdBy, participantId }: { type: string; subject?: string; createdBy: string; participantId?: string }) => {
      if (pendingRef.current) throw new Error('طلب قيد المعالجة');
      pendingRef.current = true;
      try {
        return await messagingService.createConversation({
          type,
          subject: subject || null,
          created_by: createdBy,
          participant_id: participantId || null,
        });
      } finally {
        pendingRef.current = false;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messagingKeys.conversations.prefix }),
  });
};
