import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Plus, ArrowLeft, Headphones, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import PageHeaderCard from '@/components/PageHeaderCard';
import { useBeneficiaryMessages } from '@/hooks/page/useBeneficiaryMessages';

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
                <MessageSquare className="w-4 h-4" />
                محادثة الناظر
              </Button>
              <Button onClick={() => setSupportDialogOpen(true)} variant="outline" size="sm" className="gap-2">
                <Headphones className="w-4 h-4" />
                دعم فني
              </Button>
            </div>
          }
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button variant={activeTab === 'chat' ? 'default' : 'outline'} size="sm" onClick={() => { setActiveTab('chat'); setSelectedConv(null); }}>
            <MessageSquare className="w-4 h-4 ml-1" /> المحادثات
          </Button>
          <Button variant={activeTab === 'support' ? 'default' : 'outline'} size="sm" onClick={() => { setActiveTab('support'); setSelectedConv(null); }}>
            <Headphones className="w-4 h-4 ml-1" /> الدعم الفني
          </Button>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Conversations List */}
          <Card className={cn('w-full md:w-72 shrink-0 flex flex-col', selectedConv && 'hidden md:flex')} aria-hidden={selectedConv ? true : undefined}>
            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {activeTab === 'chat' ? (
                    <>
                      <p>لا توجد محادثات بعد</p>
                      <p className="text-xs mt-1">اضغط "محادثة الناظر" لبدء محادثة جديدة</p>
                    </>
                  ) : 'لا توجد تذاكر دعم'}
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={cn(
                      'w-full text-right p-3 border-b border-border hover:bg-muted/50 transition-colors',
                      selectedConv?.id === conv.id && 'bg-accent'
                    )}
                  >
                    <p className="text-sm font-medium truncate">{conv.subject || 'محادثة'}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: ar })}
                    </p>
                  </button>
                ))
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className={cn('flex-1 flex flex-col', !selectedConv && 'hidden md:flex')}>
            {selectedConv ? (
              <>
                <div className="p-3 border-b border-border flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <p className="font-medium text-sm">{selectedConv.subject || 'محادثة'}</p>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {hasMore && (
                      <div className="text-center py-2">
                        <Button variant="ghost" size="sm" onClick={() => loadMore()} disabled={isLoadingMore}>
                          {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
                          تحميل رسائل أقدم
                        </Button>
                      </div>
                    )}
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                          <div className={cn(
                            'max-w-[75%] rounded-xl px-4 py-2 text-sm',
                            isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          )}>
                            <p>{msg.content}</p>
                            <p className={cn('text-[11px] mt-1 opacity-60', isMe ? 'text-primary-foreground' : 'text-muted-foreground')}>
                              {new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    maxLength={5000}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  />
                  <Button onClick={handleSend} disabled={!newMessage.trim() || sendMessage.isPending} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-3">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">اختر محادثة أو ابدأ محادثة جديدة مع الناظر</p>
                  <Button onClick={() => setChatDialogOpen(true)} variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    محادثة جديدة
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Chat Dialog */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display">محادثة الناظر</DialogTitle>
            <DialogDescription>ابدأ محادثة جديدة مع ناظر الوقف</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="chat-subject">الموضوع</Label>
              <Input id="chat-subject" name="chatSubject" value={chatSubject} onChange={(e) => setChatSubject(e.target.value)} placeholder="موضوع المحادثة" maxLength={200} />
            </div>
            <Button onClick={handleNewChat} className="w-full" disabled={createConversation.isPending}>
              {createConversation.isPending ? 'جاري الإنشاء...' : 'بدء المحادثة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Support Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display">طلب دعم فني</DialogTitle>
            <DialogDescription>إرسال طلب دعم فني جديد</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="support-subject">الموضوع</Label>
              <Input id="support-subject" name="supportSubject" value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} placeholder="صف مشكلتك باختصار" maxLength={200} />
            </div>
            <Button onClick={handleNewSupport} className="w-full" disabled={createConversation.isPending}>
              {createConversation.isPending ? 'جاري الإرسال...' : 'إرسال طلب الدعم'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default BeneficiaryMessagesPage;
