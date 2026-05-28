import { useNavigate } from 'react-router-dom';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { MessageSquare, Headphones, AlertCircle, RefreshCw } from 'lucide-react';
import { TableSkeleton } from '@/components/common';
import { useBeneficiaryMessages } from '@/hooks/page/beneficiary';
import ConversationsList from '@/components/messages/ConversationsList';
import ChatArea from '@/components/messages/ChatArea';
import MessageDialogs from '@/components/messages/MessageDialogs';
import { MESSAGES_VS_SUPPORT_COPY } from '@/constants/beneficiaryCopy';

const BeneficiaryMessagesPage = () => {
  const navigate = useNavigate();
  const {
    user, selectedConv, setSelectedConv,
    conversations, messages, hasMore, loadMore, isLoadingMore,
    isLoading, chatError, handleRetry,
    newMessage, setNewMessage, handleSend, sendMessage,
    chatDialogOpen, setChatDialogOpen, chatSubject, setChatSubject, handleNewChat,
    createConversation, messagesEndRef,
  } = useBeneficiaryMessages();

  if (chatError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل المراسلات</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <TableSkeleton rows={5} cols={2} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-4rem)] flex flex-col">
        {/* CR-06: المراسلات للتواصل البشري فقط — الدعم الفني صفحة منفصلة */}
        <PageHeaderCard
          title={MESSAGES_VS_SUPPORT_COPY.messages.title}
          description={MESSAGES_VS_SUPPORT_COPY.messages.description}
          icon={MessageSquare}
          actions={
            <div className="flex gap-2">
              <Button onClick={() => setChatDialogOpen(true)} variant="default" size="sm" className="gap-2">
                <MessageSquare className="w-4 h-4" />محادثة الناظر
              </Button>
              <Button
                onClick={() => navigate('/beneficiary/support')}
                variant="ghost"
                size="sm"
                className="gap-2"
                title={MESSAGES_VS_SUPPORT_COPY.messages.supportLink}
              >
                <Headphones className="w-4 h-4" />
                {MESSAGES_VS_SUPPORT_COPY.messages.supportLink}
              </Button>
            </div>
          }
        />

        <div className="flex-1 flex gap-4 min-h-0">
          <ConversationsList
            conversations={conversations}
            selectedConvId={selectedConv?.id ?? null}
            onSelect={(conv) => setSelectedConv(conv as typeof selectedConv)}
            activeTab={'chat'}
            hidden={!!selectedConv}
          />
          <ChatArea
            selectedConv={selectedConv}
            messages={messages}
            currentUserId={user?.id}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSend={handleSend}
            isSending={sendMessage.isPending}
            onBack={() => setSelectedConv(null)}
            onNewChat={() => setChatDialogOpen(true)}
            hasMore={hasMore}
            loadMore={loadMore}
            isLoadingMore={isLoadingMore}
            messagesEndRef={messagesEndRef}
            hidden={!selectedConv}
          />
        </div>
      </div>

      <MessageDialogs
        chatDialogOpen={chatDialogOpen}
        setChatDialogOpen={setChatDialogOpen}
        chatSubject={chatSubject}
        setChatSubject={setChatSubject}
        handleNewChat={handleNewChat}
        supportDialogOpen={supportDialogOpen}
        setSupportDialogOpen={setSupportDialogOpen}
        supportSubject={supportSubject}
        setSupportSubject={setSupportSubject}
        handleNewSupport={handleNewSupport}
        isPending={createConversation.isPending}
      />
    </DashboardLayout>
  );
};

export default BeneficiaryMessagesPage;

