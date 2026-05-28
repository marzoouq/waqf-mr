/**
 * Hook لمنطق صفحة مراسلات المستفيد
 *
 * #B5/B7: المراسلات للتواصل البشري فقط (chat). الدعم الفني له صفحة منفصلة
 * (/beneficiary/support) عبر نظام التذاكر (support_tickets). أُزيلت كل
 * مسارات conversations.type='support' من هنا لمنع ازدواجية النظامين.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useConversations, useMessages, useSendMessage, useCreateConversation, Conversation } from '@/hooks/data/messaging/useMessaging';
import { useRetryQueries } from '@/hooks/data/core/useRetryQueries';

export function useBeneficiaryMessages() {
  const handleRetry = useRetryQueries(['conversations']);
  const { user } = useAuth();
  const { data: chatConversations = [], isLoading: chatLoading, isError: chatError } = useConversations('chat');
  const { data: broadcastConversations = [] } = useConversations('broadcast');
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();

  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatSubject, setChatSubject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // دمج محادثات البث مع المحادثات العادية وترتيبها زمنياً
  const conversations = [...chatConversations, ...broadcastConversations]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const { data: messages = [], hasMore, loadMore, isLoadingMore } = useMessages(selectedConv?.id || null);
  const isLoading = chatLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    try {
      await sendMessage.mutateAsync({ conversationId: selectedConv.id, content: newMessage, senderId: user.id });
      setNewMessage('');
      toast.success('تم إرسال الرسالة');
    } catch {
      toast.error('تعذّر إرسال الرسالة');
    }
  }, [newMessage, selectedConv, user, sendMessage, setNewMessage]);

  const handleNewChat = useCallback(async () => {
    if (!user) return;
    try {
      const conv = await createConversation.mutateAsync({
        type: 'chat',
        subject: chatSubject || 'محادثة مع الناظر',
        createdBy: user.id,
      });
      setSelectedConv(conv);
      setChatDialogOpen(false);
      setChatSubject('');
    } catch {
      // onError in the mutation already shows a toast
    }
  }, [user, chatSubject, createConversation, setSelectedConv, setChatDialogOpen, setChatSubject]);

  return {
    user,
    selectedConv,
    setSelectedConv,
    conversations,
    messages,
    hasMore,
    loadMore,
    isLoadingMore,
    isLoading,
    chatError,
    handleRetry,
    newMessage,
    setNewMessage,
    handleSend,
    sendMessage,
    // حوار إنشاء محادثة جديدة (chat فقط)
    chatDialogOpen,
    setChatDialogOpen,
    chatSubject,
    setChatSubject,
    handleNewChat,
    createConversation,
    messagesEndRef,
  };
}
