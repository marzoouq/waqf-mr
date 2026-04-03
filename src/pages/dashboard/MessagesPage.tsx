/**
 * صفحة مراسلات الناظر/المحاسب
 */
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus } from 'lucide-react';
import PageHeaderCard from '@/components/layout/PageHeaderCard';
import ConversationList from '@/components/messages/ConversationList';
import MessageThread from '@/components/messages/MessageThread';
import NewConversationDialog from '@/components/messages/NewConversationDialog';
import { useMessagesPage } from '@/hooks/page/useMessagesPage';

const MessagesPage = () => {
  const {
    user, role, conversations, beneficiaries, messages,
    hasMore, loadMore, isLoadingMore,
    selectedConv, setSelectedConv,
    newMessage, setNewMessage,
    newConvOpen, setNewConvOpen,
    newConvBeneficiary, setNewConvBeneficiary,
    newConvSubject, setNewConvSubject,
    messagesEndRef,
    sendMessage, handleSend, handleCreateConv, getBeneficiaryName,
  } = useMessagesPage();

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

        <div className="flex-1 flex gap-2 sm:gap-4 min-h-0">
          <ConversationList
            conversations={conversations}
            selectedConvId={selectedConv?.id || null}
            onSelect={setSelectedConv}
            role={role}
            getBeneficiaryName={getBeneficiaryName}
            hidden={!!selectedConv}
          />
          <MessageThread
            selectedConv={selectedConv}
            messages={messages}
            hasMore={hasMore}
            loadMore={loadMore}
            isLoadingMore={isLoadingMore}
            userId={user?.id}
            role={role}
            getBeneficiaryName={getBeneficiaryName}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSend={handleSend}
            isSending={sendMessage.isPending}
            onBack={() => setSelectedConv(null)}
            messagesEndRef={messagesEndRef}
          />
        </div>
      </div>

      <NewConversationDialog
        open={newConvOpen}
        onOpenChange={setNewConvOpen}
        beneficiaries={beneficiaries}
        beneficiaryId={newConvBeneficiary}
        setBeneficiaryId={setNewConvBeneficiary}
        subject={newConvSubject}
        setSubject={setNewConvSubject}
        onCreate={handleCreateConv}
      />
    </DashboardLayout>
  );
};

export default MessagesPage;
