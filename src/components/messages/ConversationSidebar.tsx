import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Conversation } from '@/hooks/data/useMessaging';

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedConv: Conversation | null;
  onSelect: (conv: Conversation) => void;
  role: string | null;
  activeFilter: string;
  getBeneficiaryName: (id: string | null) => string;
  className?: string;
}

const ConversationSidebar = ({
  conversations,
  selectedConv,
  onSelect,
  role,
  activeFilter,
  getBeneficiaryName,
  className,
}: ConversationSidebarProps) => {
  return (
    <Card className={cn('w-full md:w-80 shrink-0 flex flex-col', className)}>
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
  );
};

export default ConversationSidebar;
