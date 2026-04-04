/**
 * مكون عرض تذكرة الدعم — حوار عرض التفاصيل والردود والتقييم
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Star } from 'lucide-react';
import { useTicketReplies, useAddTicketReply, useRateTicket, type SupportTicket } from '@/hooks/data/support/useSupportTickets';
import { fmtDate } from '@/utils/format/format';
import { STATUS_MAP } from './supportConstants';

interface TicketViewDialogProps {
  ticket: SupportTicket;
  onClose: () => void;
}

const TicketViewDialog = ({ ticket, onClose }: TicketViewDialogProps) => {
  const { data: replies = [], isLoading } = useTicketReplies(ticket.id);
  const addReply = useAddTicketReply();
  const rateTicket = useRateTicket();
  const [replyContent, setReplyContent] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  const handleSend = async () => {
    if (!replyContent.trim()) return;
    await addReply.mutateAsync({ ticket_id: ticket.id, content: replyContent });
    setReplyContent('');
  };

  const handleRate = async () => {
    if (rating < 1) return;
    await rateTicket.mutateAsync({ id: ticket.id, rating, rating_comment: ratingComment });
    setShowRating(false);
    onClose();
  };

  const s = STATUS_MAP[ticket.status] ?? STATUS_MAP.open!;
  const canRate = (ticket.status === 'resolved' || ticket.status === 'closed') && !ticket.rating;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>{ticket.title}</DialogTitle>
          <DialogDescription className="flex gap-2 pt-1">
            <Badge className={s.color}>{s.label}</Badge>
            <span className="text-xs">{ticket.ticket_number}</span>
          </DialogDescription>
        </DialogHeader>

        {ticket.description && (
          <div className="bg-muted/50 rounded p-3 text-sm">{ticket.description}</div>
        )}

        {ticket.resolution_notes && (
          <div className="bg-success/10 border border-success/20 rounded p-3 text-sm">
            <strong>ملاحظات الحل:</strong> {ticket.resolution_notes}
          </div>
        )}

        {ticket.rating && (
          <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">تقييمك:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i <= ticket.rating! ? 'fill-star-rating text-star-rating' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
            </div>
            {ticket.rating_comment && (
              <p className="text-sm text-muted-foreground mt-1">{ticket.rating_comment}</p>
            )}
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 max-h-[250px]">
          <div className="space-y-2 p-1">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : replies.map(r => (
              <div key={r.id} className="bg-muted/50 rounded p-2 text-sm">
                <p>{r.content}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{fmtDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        </ScrollArea>

        {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
          <div className="flex gap-2">
            <Textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="اكتب رداً..." className="flex-1" />
            <Button size="icon" onClick={handleSend} disabled={!replyContent.trim() || addReply.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}

        {canRate && !showRating && (
          <Button variant="outline" className="gap-2" onClick={() => setShowRating(true)}>
            <Star className="w-4 h-4 text-star-rating" />
            قيّم الخدمة
          </Button>
        )}

        {showRating && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium text-center">كيف تقيّم جودة الدعم المقدم؟</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  aria-label={`تقييم ${i} من 5 نجوم`}
                  aria-pressed={rating === i}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  onTouchStart={() => setHoverRating(i)}
                  onClick={() => setRating(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRating(i); } }}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      i <= (hoverRating || rating)
                        ? 'fill-star-rating text-star-rating'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {rating === 1 ? 'سيء' : rating === 2 ? 'مقبول' : rating === 3 ? 'جيد' : rating === 4 ? 'جيد جداً' : 'ممتاز'}
              </p>
            )}
            <Textarea
              placeholder="ملاحظات إضافية (اختياري)..."
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowRating(false)}>إلغاء</Button>
              <Button size="sm" className="gradient-primary gap-1" onClick={handleRate} disabled={rating < 1 || rateTicket.isPending}>
                {rateTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                إرسال التقييم
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TicketViewDialog;
