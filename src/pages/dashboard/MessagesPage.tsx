import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useConversations, useMessages, useSendMessage, useCreateConversation, useUnreadCounts, Conversation } from '@/hooks/data/useMessaging';
import { useBeneficiaries } from '@/hooks/data/useBeneficiaries';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Plus, Users, ArrowRight, Loader2, Headphones, Radio } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const FILTER_TABS = [
  { key: 'all', label: 'الكل', icon: Users },
  { key: 'chat', label: 'المحادثات', icon: MessageSquare },
  { key: 'support', label: 'الدعم الفني', icon: Headphones },
  { key: 'broadcast', label: 'البث', icon: Radio },
] as const;

type FilterKey = typeof FILTER_TABS[number]['key'];

const MessagesPage = () => {
  const { user, role } = useAuth();
  // الأدمين يرى كل الأنواع، المحاسب يرى chat فقط
  const { data: allConversations = [] } = useConversations(role === 'admin' ? undefined : 'chat');
  const { data: beneficiaries = [] } = useBeneficiaries();
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();
  const { data: unread } = useUnreadCounts();

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvBeneficiary, setNewConvBeneficiary] = useState('');
  const [newConvSubject, setNewConvSubject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // فلترة المحادثات حسب النوع
  const conversations = activeFilter === 'all'
    ? allConversations
    : allConversations.filter(c => c.type === activeFilter);

  const { data: messages = [], hasMore, loadMore, isLoadingMore } = useMessages(selectedConv?.id || null);

  // التمرير للأسفل عند وصول رسائل جديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset scroll when switching conversations
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [selectedConv?.id]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    try {
      await sendMessage.mutateAsync({ conversationId: selectedConv.id, content: newMessage, senderId: user.id });
      setNewMessage('');
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
          {/* Conversations List */}
          <Card className={cn('w-full md:w-80 shrink-0 flex flex-col', selectedConv && 'hidden md:flex')}>
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{conversations.length} محادثة</span>
              </div>
            </div>
            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {role === 'admin' ? 'لا توجد محادثات' : 'لا توجد محادثات حالياً. سيقوم ناظر الوقف ببدء المحادثة عند الحاجة.'}
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate flex-1">{conv.subject || 'محادثة'}</p>
                      {activeFilter === 'all' && (
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full shrink-0',
                          conv.type === 'chat' && 'bg-primary/10 text-primary',
                          conv.type === 'support' && 'bg-destructive/10 text-destructive',
                          conv.type === 'broadcast' && 'bg-accent text-accent-foreground',
                        )}>
                          {conv.type === 'chat' ? 'محادثة' : conv.type === 'support' ? 'دعم' : 'بث'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {role === 'admin' ? getBeneficiaryName(conv.participant_id || conv.created_by) : 'ناظر الوقف'}
                    </p>
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
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConv(null)} aria-label="رجوع">
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <div>
                    <p className="font-medium text-sm">{selectedConv.subject || 'محادثة'}</p>
                    <p className="text-xs text-muted-foreground">
                      {role === 'admin' ? getBeneficiaryName(selectedConv.participant_id || selectedConv.created_by) : 'ناظر الوقف'}
                    </p>
                  </div>
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
                  <Button onClick={handleSend} disabled={!newMessage.trim() || sendMessage.isPending} size="icon" aria-label="إرسال الرسالة">
                    {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">اختر محادثة للبدء</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display">محادثة جديدة</DialogTitle>
            <DialogDescription className="sr-only">بدء محادثة جديدة مع مستفيد</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="msg-beneficiary">المستفيد</Label>
              <NativeSelect id="msg-beneficiary" value={newConvBeneficiary} onValueChange={setNewConvBeneficiary} placeholder="اختر المستفيد" options={beneficiaries.filter((b) => b.user_id).map((b) => ({ value: b.user_id!, label: b.name }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="msg-subject">الموضوع</Label>
              <Input id="msg-subject" name="newConvSubject" value={newConvSubject} onChange={(e) => setNewConvSubject(e.target.value)} placeholder="موضوع المحادثة" maxLength={200} />
            </div>
            <Button onClick={handleCreateConv} disabled={!newConvBeneficiary} className="w-full">
              بدء المحادثة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MessagesPage;
