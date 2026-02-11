import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface Conversation {
  id: string;
  type: string;
  subject: string | null;
  status: string;
  created_by: string;
  participant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export const useConversations = (type?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', type],
    queryFn: async (): Promise<Conversation[]> => {
      let q = supabase.from('conversations').select('*').order('updated_at', { ascending: false });
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Conversation[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('conversations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

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
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!user && !!conversationId,
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
      // Update conversation updated_at
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
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
