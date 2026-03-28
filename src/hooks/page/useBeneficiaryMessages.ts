/**
 * Hook لمنطق صفحة مراسلات المستفيد
 * يتضمن: إدارة المحادثات، الإرسال، إنشاء محادثة/دعم جديد
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useMessages, useSendMessage, useCreateConversation, Conversation } from '@/hooks/data/useMessaging';

export function useBeneficiaryMessages() {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }), [queryClient]);
  const { user } = useAuth();
  const { data: chatConversations = [], isLoading: chatLoading, isError: chatError } = useConversations('chat');
  const { data: broadcastConversations = [] } = useConversations('broadcast');
  const { data: supportConversations = [], isLoading: supportLoading } = useConversations('support');
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();

  const [activeTab, setActiveTab] = useState<'chat' | 'support'>('chat');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatSubject, setChatSubject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // دمج محادثات البث مع المحادثات العادية وترتيبها زمنياً
  const allChatConversations = [...chatConversations, ...broadcastConversations]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const conversations = activeTab === 'chat' ? allChatConversations : supportConversations;
  const { data: messages = [], hasMore, loadMore, isLoadingMore } = useMessages(selectedConv?.id || null);
  const isLoading = chatLoading || supportLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // إعادة التعيين عند تبديل التبويب
  useEffect(() => {
    setSelectedConv(null);
  }, [activeTab]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    try {
      await sendMessage.mutateAsync({ conversationId: selectedConv.id, content: newMessage, senderId: user.id });
      setNewMessage('');
    } catch {
      // onError in the mutation already shows a toast
    }
  }, [newMessage, selectedConv, user, sendMessage]);

  const handleNewSupport = useCallback(async () => {
    if (!user) return;
    try {
      const conv = await createConversation.mutateAsync({
        type: 'support',
        subject: supportSubject || 'طلب دعم فني',
        createdBy: user.id,
      });
      setSelectedConv(conv);
      setActiveTab('support');
      setSupportDialogOpen(false);
      setSupportSubject('');
    } catch {
      // onError in the mutation already shows a toast
    }
  }, [user, supportSubject, createConversation]);

  const handleNewChat = useCallback(async () => {
    if (!user) return;
    try {
      const conv = await createConversation.mutateAsync({
        type: 'chat',
        subject: chatSubject || 'محادثة مع الناظر',
        createdBy: user.id,
      });
      setSelectedConv(conv);
      setActiveTab('chat');
      setChatDialogOpen(false);
      setChatSubject('');
    } catch {
      // onError in the mutation already shows a toast
    }
  }, [user, chatSubject, createConversation]);

  return {
    user,
    activeTab,
    setActiveTab,
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
    // حوارات الإنشاء
    supportDialogOpen,
    setSupportDialogOpen,
    supportSubject,
    setSupportSubject,
    handleNewSupport,
    chatDialogOpen,
    setChatDialogOpen,
    chatSubject,
    setChatSubject,
    handleNewChat,
    createConversation,
    messagesEndRef,
  };
}
