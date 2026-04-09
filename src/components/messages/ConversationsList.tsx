/**
 * قائمة المحادثات — مكوّن فرعي من صفحة المراسلات
 */
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Conversation {
  id: string;
  subject: string | null;
  updated_at: string;
  [key: string]: unknown;
}

interface ConversationsListProps {
  conversations: Conversation[];
  selectedConvId: string | null;
  onSelect: (conv: Conversation) => void;
  activeTab: 'chat' | 'support';
  hidden?: boolean;
}

export default function ConversationsList({ conversations, selectedConvId, onSelect, activeTab, hidden }: ConversationsListProps) {
  return (
    <Card className={cn('w-full md:w-72 shrink-0 flex flex-col', hidden && 'hidden md:flex')} aria-hidden={hidden || undefined}>
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
              onClick={() => onSelect(conv)}
              className={cn(
                'w-full text-right p-3 border-b border-border hover:bg-muted/50 transition-colors',
                selectedConvId === conv.id && 'bg-accent'
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
  );
}
