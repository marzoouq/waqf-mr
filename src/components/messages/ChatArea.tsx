import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conversation, Message } from '@/hooks/data/useMessaging';

interface ChatAreaProps {
  selectedConv: Conversation | null;
  messages: Message[];
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
  userId: string | undefined;
  role: string | null;
  getBeneficiaryName: (id: string | null) => string;
  onSend: (message: string) => Promise<void>;
  isSending: boolean;
  onBack: () => void;
  className?: string;
}

const ChatArea = ({
  selectedConv,
  messages,
  hasMore,
  loadMore,
  isLoadingMore,
  userId,
  role,
  getBeneficiaryName,
  onSend,
  isSending,
  onBack,
  className,
}: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');

  // التمرير للأسفل عند وصول رسائل جديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset scroll when switching conversations
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [selectedConv?.id]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const msg = newMessage;
    setNewMessage('');
    await onSend(msg);
  };

  return (
    <Card className={cn('flex-1 flex flex-col', !selectedConv && 'hidden md:flex', className)}>
      {selectedConv ? (
        <>
          <div className="p-3 border-b border-border flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="رجوع">
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
                const isMe = msg.sender_id === userId;
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
              id="admin-message-input"
              name="admin_message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك..."
              maxLength={5000}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <Button onClick={handleSend} disabled={!newMessage.trim() || isSending} size="icon" aria-label="إرسال الرسالة">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
  );
};

export default ChatArea;
