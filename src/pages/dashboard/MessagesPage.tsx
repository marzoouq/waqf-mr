import { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useConversations, useMessages, useSendMessage, useCreateConversation, useUnreadCounts, Conversation } from '@/hooks/data/useMessaging';
import { useBeneficiaries } from '@/hooks/data/useBeneficiaries';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, Users, Headphones, Radio } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import ConversationSidebar from '@/components/messages/ConversationSidebar';
import ChatArea from '@/components/messages/ChatArea';
import NewConversationDialog from '@/components/messages/NewConversationDialog';

const FILTER_TABS = [
  { key: 'all', label: 'الكل', icon: Users },
  { key: 'chat', label: 'المحادثات', icon: MessageSquare },
  { key: 'support', label: 'الدعم الفني', icon: Headphones },
  { key: 'broadcast', label: 'البث', icon: Radio },
] as const;

type FilterKey = typeof FILTER_TABS[number]['key'];

const MessagesPage = () => {
  const { user, role } = useAuth();
  const { data: allConversations = [] } = useConversations(role === 'admin' ? undefined : 'chat');
  const { data: beneficiaries = [] } = useBeneficiaries();
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();
  const { data: unread } = useUnreadCounts();

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvBeneficiary, setNewConvBeneficiary] = useState('');
  const [newConvSubject, setNewConvSubject] = useState('');

  const conversations = activeFilter === 'all'
    ? allConversations
    : allConversations.filter(c => c.type === activeFilter);

  const { data: messages = [], hasMore, loadMore, isLoadingMore } = useMessages(selectedConv?.id || null);

  const handleSend = async (content: string) => {
    if (!content.trim() || !selectedConv || !user) return;
    try {
      await sendMessage.mutateAsync({ conversationId: selectedConv.id, content, senderId: user.id });
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const handleCreateConv = async () => {
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
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const getBeneficiaryName = (id: string | null) => {
    if (!id) return 'غير محدد';
    const b = beneficiaries.find((b) => b.user_id === id);
    return b?.name || 'مستخدم';
  };

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-4 md:p-6 h-[calc(100dvh-11.5rem)] lg:h-[calc(100dvh-4rem)] flex flex-col">
        <PageHeaderCard
          title="المراسلات"
          icon={MessageSquare}
          description="التواصل مع المستفيدين والناظر"
          actions={role === 'admin' ? (
            <Button onClick={() => setNewConvOpen(true)} className="gap-2" size="sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">محادثة جديدة</span>
            </Button>
          ) : undefined}
          className="mb-0"
        />

        {/* فلترة حسب النوع — للأدمين فقط */}
        {role === 'admin' && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {FILTER_TABS.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={activeFilter === key ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5"
                onClick={() => { setActiveFilter(key); setSelectedConv(null); }}
              >
                <Icon className="w-4 h-4" />
                {label}
                {(() => {
                  const unreadCount = key === 'all'
                    ? (unread?.total ?? 0)
                    : key === 'chat' ? (unread?.chat ?? 0)
                    : key === 'support' ? (unread?.support ?? 0)
                    : (unread?.broadcast ?? 0);
                  return unreadCount > 0 ? (
                    <span className="min-w-5 h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : key !== 'all' ? (
                    <span className="text-xs opacity-70">
                      ({allConversations.filter(c => c.type === key).length})
                    </span>
                  ) : null;
                })()}
              </Button>
            ))}
          </div>
        )}

        <div className="flex-1 flex gap-2 sm:gap-4 min-h-0">
          <ConversationSidebar
            conversations={conversations}
            selectedConv={selectedConv}
            onSelect={setSelectedConv}
            role={role}
            activeFilter={activeFilter}
            getBeneficiaryName={getBeneficiaryName}
            className={selectedConv ? 'hidden md:flex' : undefined}
          />

          <ChatArea
            selectedConv={selectedConv}
            messages={messages}
            hasMore={hasMore}
            loadMore={loadMore}
            isLoadingMore={isLoadingMore}
            userId={user?.id}
            role={role}
            getBeneficiaryName={getBeneficiaryName}
            onSend={handleSend}
            isSending={sendMessage.isPending}
            onBack={() => setSelectedConv(null)}
          />
        </div>
      </div>

      <NewConversationDialog
        open={newConvOpen}
        onOpenChange={setNewConvOpen}
        beneficiaries={beneficiaries}
        beneficiaryId={newConvBeneficiary}
        onBeneficiaryChange={setNewConvBeneficiary}
        subject={newConvSubject}
        onSubjectChange={setNewConvSubject}
        onSubmit={handleCreateConv}
      />
    </DashboardLayout>
  );
};

export default MessagesPage;
