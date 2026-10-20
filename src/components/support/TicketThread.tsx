/**
 * سجل محادثة التذكرة — فقاعات تميّز «أنا» عن الطرف الآخر مع دور المرسل والوقت.
 * مشترك بين نافذة الناظر ونافذة المستفيد.
 */
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/cn';
import { fmtDateTime } from '@/utils/format/format';
import { SENDER_ROLE_LABEL } from '@/constants/support';
import type { SupportTicket, TicketReply } from '@/types/support';

interface TicketThreadProps {
  ticket: SupportTicket;
  replies: TicketReply[];
  senderRoles: Record<string, string>;
  currentUserId: string | undefined;
  isLoading: boolean;
}

interface Bubble { id: string; senderId: string; content: string; createdAt: string; internal: boolean; }

const TicketThread = ({ ticket, replies, senderRoles, currentUserId, isLoading }: TicketThreadProps) => {
  const bubbles: Bubble[] = [
    ...(ticket.description ? [{ id: 'desc', senderId: ticket.created_by, content: ticket.description, createdAt: ticket.created_at, internal: false }] : []),
    ...replies.map((r) => ({ id: r.id, senderId: r.sender_id, content: r.content, createdAt: r.created_at, internal: r.is_internal })),
  ];

  const roleLabel = (senderId: string) => {
    if (senderId === currentUserId) return 'أنا';
    if (senderId === ticket.created_by) return 'صاحب التذكرة';
    return SENDER_ROLE_LABEL[senderRoles[senderId] ?? ''] ?? 'فريق الوقف';
  };

  return (
    <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
      <div className="space-y-3 p-1">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : bubbles.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">لا توجد رسائل بعد</p>
        ) : bubbles.map((b) => {
          const mine = b.senderId === currentUserId;
          return (
            <div key={b.id} className={cn('flex', mine ? 'justify-start' : 'justify-end')}>
              <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                b.internal ? 'bg-warning/10 border border-warning/30'
                  : mine ? 'bg-primary text-primary-foreground rounded-ss-sm' : 'bg-muted rounded-se-sm')}>
                <p className={cn('text-[11px] font-bold mb-0.5', mine && !b.internal ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {roleLabel(b.senderId)}{b.internal && ' — ملاحظة داخلية'}{b.id === 'desc' && ' — وصف الطلب'}
                </p>
                <p className="whitespace-pre-wrap break-words">{b.content}</p>
                <p className={cn('text-[10px] mt-1', mine && !b.internal ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {fmtDateTime(b.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default TicketThread;
