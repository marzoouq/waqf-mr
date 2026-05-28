/**
 * Hook لمنطق صفحة المراسلات — مُشترك بين جميع الأدوار
 * (ناظر/محاسب يستخدمونها من /dashboard/messages
 *  مستفيد/واقف من /beneficiary/messages)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useConversations, useMessages, useSendMessage, useCreateConversation, Conversation } from '@/hooks/data/messaging/useMessaging';
import { useBeneficiaries } from '@/hooks/data/beneficiaries/useBeneficiaries';

export function useMessagesPage() {
  const { user, role } = useAuth();
  const { data: conversations = [] } = useConversations(role === 'admin' ? undefined : 'chat');
  const { data: beneficiaries = [] } = useBeneficiaries();
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();

  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvBeneficiary, setNewConvBeneficiary] = useState('');
  const [newConvSubject, setNewConvSubject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], hasMore, loadMore, isLoadingMore } = useMessages(selectedConv?.id || null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [selectedConv?.id]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    try {
      await sendMessage.mutateAsync({ conversationId: selectedConv.id, content: newMessage, senderId: user.id });
      setNewMessage('');
      toast.success('تم إرسال الرسالة');
    } catch {
      toast.error('تعذّر إرسال الرسالة');
    }
  }, [newMessage, selectedConv, user, sendMessage]);

  const handleCreateConv = useCallback(async () => {
    if (!user || !newConvBeneficiary || role !== 'admin') return;
    try {
      const conv = await createConversation.mutateAsync({
        type: 'chat',
        subject: newConvSubject || 'محادثة جديدة',
        createdBy: user.id,
        participantId: newConvBeneficiary,
      });
      setSelectedConv(conv);
      setNewConvOpen(false);
      setNewConvSubject('');
      setNewConvBeneficiary('');
      toast.success('تم إنشاء المحادثة');
    } catch {
      toast.error('تعذّر إنشاء المحادثة');
    }
  }, [user, newConvBeneficiary, role, newConvSubject, createConversation]);

  const getBeneficiaryName = useCallback((id: string | null) => {
    if (!id) return 'غير محدد';
    const b = beneficiaries.find((b) => b.user_id === id);
    return b?.name || 'مستخدم';
  }, [beneficiaries]);

  return {
    user, role, conversations, beneficiaries, messages,
    hasMore, loadMore, isLoadingMore,
    selectedConv, setSelectedConv,
    newMessage, setNewMessage,
    newConvOpen, setNewConvOpen,
    newConvBeneficiary, setNewConvBeneficiary,
    newConvSubject, setNewConvSubject,
    messagesEndRef,
    sendMessage, handleSend, handleCreateConv, getBeneficiaryName,
  };
}
