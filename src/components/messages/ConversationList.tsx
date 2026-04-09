/**
 * قائمة المحادثات الجانبية
 */
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Conversation } from '@/hooks/data/messaging/useMessaging';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConvId: string | null;
  onSelect: (conv: Conversation) => void;
  role: string | null;
  getBeneficiaryName: (id: string | null) => string;
  hidden?: boolean;
}

export default function ConversationList({
  conversations, selectedConvId, onSelect, role, getBeneficiaryName, hidden,
}: ConversationListProps) {
  return (
    <Card className={cn('w-full md:w-80 shrink-0 flex flex-col', hidden && 'hidden md:flex')}>
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
              onClick={() => onSelect(conv)}
              className={cn(
                'w-full text-right p-3 border-b border-border hover:bg-muted/50 transition-colors',
                selectedConvId === conv.id && 'bg-accent'
              )}
            >
              <p className="text-sm font-medium truncate">{conv.subject || 'محادثة'}</p>
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
  );
}
