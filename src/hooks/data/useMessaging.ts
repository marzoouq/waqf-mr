/**
 * ملف تجميعي لهوكات المراسلة — يعيد تصدير من الملفات المقسّمة
 * للحفاظ على التوافق الرجعي مع الاستيرادات الحالية
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useRef } from 'react';
import { Conversation } from '@/types/database';
import { notifyUser } from '@/utils/notifications';
import { logger } from '@/lib/logger';

// إعادة تصدير من الملفات المقسّمة
export { useUnreadCounts, type UnreadCounts } from './useUnreadCounts';
export { useConversations } from './useConversations';
export { useMessages } from './useChatMessages';
export type { Conversation, Message } from '@/types/database';

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
          // فشل الإشعار غير حرج
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
