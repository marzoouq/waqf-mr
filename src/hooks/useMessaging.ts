import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';
import { Conversation, Message } from '@/types/database';
import { notifyUser } from '@/utils/notifications';
import { logger } from '@/lib/logger';

export type { Conversation, Message };

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
    staleTime: 30_000, // BUG-8 fix: conversations list relies on Realtime for updates
  });

  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!user) return;
    const channelName = `conversations-${user.id}-${type || 'all'}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        queryClientRef.current.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, type]);

  return query;
};

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, is_read, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return ((data || []) as Message[]).reverse();
    },
    enabled: !!user && !!conversationId,
    staleTime: 5_000, // H12 fix: reduced from 30s for better chat responsiveness
  });

  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!user || !conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => {
        queryClientRef.current.invalidateQueries({ queryKey: ['messages', conversationId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, conversationId]);

  return query;
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  return useMutation({
    mutationFn: async ({ conversationId, content, senderId }: { conversationId: string; content: string; senderId: string }) => {
      const trimmed = content.trim();
      if (!trimmed || trimmed.length > 5000) throw new Error('رسالة غير صالحة');
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: trimmed,
      });
      if (error) throw error;
      const { error: updateError } = await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
      if (updateError) logger.warn('Failed to update conversation timestamp:', updateError.message);

      // H6 fix: notify beneficiary when admin OR accountant sends a message
      if (role === 'admin' || role === 'accountant') {
        try {
          const { data: conv } = await supabase
            .from('conversations')
            .select('participant_id, subject')
            .eq('id', conversationId)
            .maybeSingle();
          if (conv?.participant_id) {
            notifyUser(
              conv.participant_id,
              'رسالة جديدة من ناظر الوقف',
              `لديك رسالة جديدة في محادثة "${conv.subject || 'محادثة'}"`,
              'info',
              '/beneficiary/messages',
            );
          }
        } catch {
          // Silent fail — notification is non-critical
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['messages', vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const pendingRef = useRef(false);
  return useMutation({
    mutationFn: async ({ type, subject, createdBy, participantId }: { type: string; subject?: string; createdBy: string; participantId?: string }) => {
      // Idempotency guard: prevent duplicate conversation creation on double-click
      if (pendingRef.current) throw new Error('طلب قيد المعالجة');
      pendingRef.current = true;
      try {
        const { data, error } = await supabase.from('conversations').insert({
          type,
          subject: subject || null,
          created_by: createdBy,
          participant_id: participantId || null,
        }).select().single();
        if (error) throw error;
        return data as Conversation;
      } finally {
        pendingRef.current = false;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
};
