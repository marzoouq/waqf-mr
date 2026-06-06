/**
 * messagingService — استعلامات وعمليات على conversations + messages.
 * مستخرج من useMessaging.ts ضمن M2.4.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Conversation, Message } from '@/types';
import { logger } from '@/lib/logger';

export const MESSAGES_PAGE_SIZE = 50;

export const messagingService = {
  async listConversations(type?: string): Promise<Conversation[]> {
    let q = supabase
      .from('conversations')
      .select('id, type, subject, status, created_by, participant_id, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);
    if (type) q = q.eq('type', type);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Conversation[];
  },

  /** قراءة participant + subject لمحادثة (للإشعار بعد الإرسال) */
  async getConversationParticipant(conversationId: string) {
    const { data } = await supabase
      .from('conversations')
      .select('participant_id, subject')
      .eq('id', conversationId)
      .maybeSingle();
    return data;
  },

  async listMessagesPage(
    conversationId: string,
    pageParam: { created_at: string; id: string } | undefined,
  ): Promise<Message[]> {
    let q = supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, is_read, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    if (pageParam) {
      q = q.or(
        `created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`,
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return ((data || []) as Message[]).reverse();
  },

  async insertMessage(payload: { conversation_id: string; sender_id: string; content: string }) {
    const { error } = await supabase.from('messages').insert(payload);
    if (error) throw error;
  },

  async touchConversation(conversationId: string) {
    const { error } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    if (error) logger.warn('Failed to update conversation timestamp:', error.message);
  },

  async createConversation(payload: {
    type: string;
    subject?: string | null;
    created_by: string;
    participant_id?: string | null;
  }): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        type: payload.type,
        subject: payload.subject ?? null,
        created_by: payload.created_by,
        participant_id: payload.participant_id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Conversation;
  },

  /**
   * إنشاء محادثة broadcast لمستفيد واحد + إدراج الرسالة الأولى.
   * يُرجع true عند النجاح؛ يلتقط الأخطاء داخلياً ويرسلها للـ logger.
   */
  async sendBroadcastToRecipient(payload: {
    senderId: string;
    recipientUserId: string | null;
    recipientName: string;
    subject: string;
    content: string;
  }): Promise<boolean> {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'broadcast',
        subject: payload.subject,
        created_by: payload.senderId,
        participant_id: payload.recipientUserId,
      })
      .select('id')
      .single();

    if (convError || !conv) {
      logger.error('فشل إنشاء محادثة للمستفيد:', payload.recipientName, convError);
      return false;
    }

    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conv.id,
        sender_id: payload.senderId,
        content: payload.content,
      });

    if (msgError) {
      logger.error('فشل إرسال رسالة للمستفيد:', payload.recipientName, msgError);
      return false;
    }

    return true;
  },
};
