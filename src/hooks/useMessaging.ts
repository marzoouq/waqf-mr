import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { Conversation, Message } from '@/types/database';
import { notifyUser } from '@/utils/notifications';

export type { Conversation, Message };

export const useConversations = (type?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', type],
    queryFn: async (): Promise<Conversation[]> => {
      let q = supabase.from('conversations').select('*').order('updated_at', { ascending: false }).limit(500);
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Conversation[];
    },
    enabled: !!user,
    staleTime: 30_000, // BUG-8 fix: conversations list relies on Realtime for updates
  });

  useEffect(() => {
    if (!user) return;
    // H7 fix: unique channel name per type to avoid conflicts when called twice
    const channelName = `conversations-${user.id}-${type || 'all'}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient, type]);

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
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!user && !!conversationId,
    staleTime: 5_000, // H12 fix: reduced from 30s for better chat responsiveness
  });

  useEffect(() => {
    if (!user || !conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, conversationId, queryClient]);

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
      if (updateError) console.warn('Failed to update conversation timestamp:', updateError.message);

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
  return useMutation({
    mutationFn: async ({ type, subject, createdBy, participantId }: { type: string; subject?: string; createdBy: string; participantId?: string }) => {
      const { data, error } = await supabase.from('conversations').insert({
        type,
        subject: subject || null,
        created_by: createdBy,
        participant_id: participantId || null,
      }).select().single();
      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
};
