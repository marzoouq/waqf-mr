/**
 * حوار عرض تفاصيل تذكرة الدعم الفني
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Headset, Send, Loader2, CheckCircle, Clock, Star } from 'lucide-react';
import {
  useTicketReplies, useUpdateTicketStatus, useAddTicketReply,
  type SupportTicket,
} from '@/hooks/data/useSupportTickets';
import { PRIORITY_MAP, STATUS_MAP, CATEGORY_MAP } from '@/hooks/page/useSupportDashboardPage';

interface Props {
  ticket: SupportTicket;
  onClose: () => void;
  isAdmin: boolean;
}

export default function TicketDetailDialog({ ticket, onClose, isAdmin }: Props) {
  const { data: replies = [], isLoading } = useTicketReplies(ticket.id);
  const updateStatus = useUpdateTicketStatus();
  const addReply = useAddTicketReply();
  const [replyContent, setReplyContent] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleSendReply = async () => {
    if (!replyContent.trim()) return;
    await addReply.mutateAsync({ ticket_id: ticket.id, content: replyContent });
    setReplyContent('');
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: ticket.id, status: newStatus, resolution_notes: newStatus === 'resolved' ? resolutionNotes : undefined });
  };

  const s = STATUS_MAP[ticket.status] ?? STATUS_MAP.open!;
  const p = PRIORITY_MAP[ticket.priority] ?? PRIORITY_MAP.medium!;
  const ageMs = Date.now() - new Date(ticket.created_at).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageLabel = ageHours < 1 ? `${Math.round(ageHours * 60)} دقيقة` : ageHours < 24 ? `${Math.round(ageHours)} ساعة` : `${Math.round(ageHours / 24)} يوم`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Headset className="w-5 h-5" />تذكرة: {ticket.ticket_number}</DialogTitle>
          <DialogDescription>{ticket.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 px-1">
          <Badge className={s.color}>{s.label}</Badge>
          <Badge className={p.color}>{p.label}</Badge>
          <Badge variant="outline">{CATEGORY_MAP[ticket.category] || ticket.category}</Badge>
          <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 ml-1" />عمر التذكرة: {ageLabel}</Badge>
        </div>

        {ticket.description && <div className="bg-muted/50 rounded-md p-3 text-sm">{ticket.description}</div>}
        {ticket.resolution_notes && (
          <div className="bg-success/10 border border-success/20 rounded-md p-3 text-sm">
            <span className="font-medium text-success">ملاحظات الحل:</span> {ticket.resolution_notes}
          </div>
        )}
        {ticket.rating && (
          <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">تقييم المستفيد:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i <= ticket.rating! ? 'fill-star-rating text-star-rating' : 'text-muted-foreground/30'}`} aria-label={`نجمة ${i} من 5`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({ticket.rating}/5)</span>
            </div>
            {ticket.rating_comment && <p className="text-sm text-muted-foreground mt-1">{ticket.rating_comment}</p>}
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
          <div className="space-y-3 p-1">
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : replies.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">لا توجد ردود بعد</p>
            ) : replies.map(reply => (
              <div key={reply.id} className={`rounded-lg p-3 text-sm ${reply.is_internal ? 'bg-warning/10 border border-warning/20' : 'bg-muted/50'}`}>
                <p>{reply.content}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(reply.created_at).toLocaleString('ar-SA')}
                  {reply.is_internal && ' — ملاحظة داخلية'}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea id="ticket-detail-reply" name="ticket_detail_reply" value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="اكتب رداً..." className="flex-1 min-h-[60px]" />
          <Button size="icon" onClick={handleSendReply} disabled={!replyContent.trim() || addReply.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {isAdmin && ticket.status !== 'closed' && (
          <DialogFooter className="flex-wrap gap-2">
            {ticket.status === 'open' && (
              <Button variant="outline" onClick={() => handleStatusChange('in_progress')} disabled={updateStatus.isPending}>بدء المعالجة</Button>
            )}
            {(ticket.status === 'open' || ticket.status === 'in_progress') && (
              <>
                <Input id="resolution-notes" name="resolution_notes" placeholder="ملاحظات الحل..." value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} className="flex-1 min-w-0 sm:min-w-[200px]" />
                <Button className="gradient-primary" onClick={() => handleStatusChange('resolved')} disabled={updateStatus.isPending}>
                  <CheckCircle className="w-4 h-4 ml-1" />تم الحل
                </Button>
              </>
            )}
            {ticket.status === 'resolved' && (
              <Button variant="outline" onClick={() => handleStatusChange('closed')} disabled={updateStatus.isPending}>إغلاق نهائي</Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
