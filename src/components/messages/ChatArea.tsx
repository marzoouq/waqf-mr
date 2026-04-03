/**
 * منطقة الدردشة — مكوّن فرعي من صفحة المراسلات
 */
import { RefObject } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface Conversation {
  id: string;
  subject: string | null;
}

interface ChatAreaProps {
  selectedConv: Conversation | null;
  messages: Message[];
  currentUserId: string | undefined;
  newMessage: string;
  setNewMessage: (v: string) => void;
  onSend: () => void;
  isSending: boolean;
  onBack: () => void;
  onNewChat: () => void;
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  hidden?: boolean;
}

export default function ChatArea({
  selectedConv, messages, currentUserId, newMessage, setNewMessage,
  onSend, isSending, onBack, onNewChat,
  hasMore, loadMore, isLoadingMore, messagesEndRef, hidden,
}: ChatAreaProps) {
  return (
    <Card className={cn('flex-1 flex flex-col', hidden && 'hidden md:flex')}>
      {selectedConv ? (
        <>
          <div className="p-3 border-b border-border flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
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
                const isMe = msg.sender_id === currentUserId;
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
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            />
            <Button onClick={onSend} disabled={!newMessage.trim() || isSending} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-3">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">اختر محادثة أو ابدأ محادثة جديدة مع الناظر</p>
            <Button onClick={onNewChat} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              محادثة جديدة
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
