import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { MessageSquare, Headphones, AlertCircle, RefreshCw } from 'lucide-react';
import { TableSkeleton } from '@/components/common';
import { useBeneficiaryMessages } from '@/hooks/page/beneficiary/useBeneficiaryMessages';
import ConversationsList from '@/components/messages/ConversationsList';
import ChatArea from '@/components/messages/ChatArea';
import MessageDialogs from '@/components/messages/MessageDialogs';

const BeneficiaryMessagesPage = () => {
  const {
    user, activeTab, setActiveTab, selectedConv, setSelectedConv,
    conversations, messages, hasMore, loadMore, isLoadingMore,
    isLoading, chatError, handleRetry,
    newMessage, setNewMessage, handleSend, sendMessage,
    supportDialogOpen, setSupportDialogOpen, supportSubject, setSupportSubject, handleNewSupport,
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
        <PageHeaderCard
          title="المراسلات"
          description="التواصل مع ناظر الوقف والدعم الفني"
          icon={MessageSquare}
          actions={
            <div className="flex gap-2">
              <Button onClick={() => setChatDialogOpen(true)} variant="default" size="sm" className="gap-2">
                <MessageSquare className="w-4 h-4" />محادثة الناظر
              </Button>
              <Button onClick={() => setSupportDialogOpen(true)} variant="outline" size="sm" className="gap-2">
                <Headphones className="w-4 h-4" />دعم فني
              </Button>
            </div>
          }
        />

        <div className="flex gap-2 mb-4">
          <Button variant={activeTab === 'chat' ? 'default' : 'outline'} size="sm" onClick={() => { setActiveTab('chat'); setSelectedConv(null); }}>
            <MessageSquare className="w-4 h-4 ms-1" /> المحادثات
          </Button>
          <Button variant={activeTab === 'support' ? 'default' : 'outline'} size="sm" onClick={() => { setActiveTab('support'); setSelectedConv(null); }}>
            <Headphones className="w-4 h-4 ms-1" /> الدعم الفني
          </Button>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          <ConversationsList
            conversations={conversations}
            selectedConvId={selectedConv?.id ?? null}
            onSelect={(conv) => setSelectedConv(conv as typeof selectedConv)}
            activeTab={activeTab}
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
