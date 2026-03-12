/**
 * صفحة الدعم الفني للمستفيد — تقديم ومتابعة تذاكر الدعم + تقييم الخدمة
 */
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Headset, CheckCircle, Clock, Send, Loader2, MessageSquare, XCircle, ArrowUpCircle, Eye, Plus, Star,
} from 'lucide-react';
import { useState } from 'react';
import PageHeaderCard from '@/components/PageHeaderCard';
import {
  useSupportTickets, useTicketReplies, useCreateTicket,
  useAddTicketReply, useRateTicket, type SupportTicket,
} from '@/hooks/useSupportTickets';

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'مفتوح', color: 'bg-blue-500/20 text-blue-600', icon: Clock },
  in_progress: { label: 'قيد المعالجة', color: 'bg-warning/20 text-warning', icon: ArrowUpCircle },
  resolved: { label: 'تم الحل', color: 'bg-success/20 text-success', icon: CheckCircle },
  closed: { label: 'مغلق', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const BeneficiarySupportPage = () => {
  const { data, isLoading } = useSupportTickets();
  const tickets = data?.tickets ?? [];
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard
          title="الدعم الفني"
          description="تقديم ومتابعة طلبات الدعم"
          icon={Headset}
          actions={
            <Button onClick={() => setShowNewTicket(true)} className="gradient-primary">
              <Plus className="w-4 h-4 ml-2" />
              طلب دعم جديد
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              تذاكري
              <span className="text-sm font-normal text-muted-foreground">({tickets.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <Headset className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">لا توجد تذاكر — يمكنك إنشاء طلب دعم جديد</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">الرقم</TableHead>
                    <TableHead className="text-right">العنوان</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">التقييم</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map(ticket => {
                    const s = STATUS_MAP[ticket.status] || STATUS_MAP.open;
                    const Icon = s.icon;
                    return (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">{ticket.ticket_number}</TableCell>
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell>
                          <Badge className={s.color}><Icon className="w-3 h-3 ml-1" />{s.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.rating ? (
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i <= ticket.rating! ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                              ))}
                            </div>
                          ) : (ticket.status === 'resolved' || ticket.status === 'closed') ? (
                            <span className="text-xs text-muted-foreground">بانتظار التقييم</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{new Date(ticket.created_at).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => setSelectedTicket(ticket)}>
                            <Eye className="w-3 h-3 ml-1" />عرض
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedTicket && (
        <TicketViewDialog ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      <NewTicketDialog open={showNewTicket} onClose={() => setShowNewTicket(false)} />
    </DashboardLayout>
  );
};

function TicketViewDialog({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
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

  const s = STATUS_MAP[ticket.status] || STATUS_MAP.open;
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

        {/* عرض التقييم الحالي */}
        {ticket.rating && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">تقييمك:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i <= ticket.rating! ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
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
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString('ar-SA')}</p>
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

        {/* زر التقييم */}
        {canRate && !showRating && (
          <Button variant="outline" className="gap-2" onClick={() => setShowRating(true)}>
            <Star className="w-4 h-4 text-amber-400" />
            قيّم الخدمة
          </Button>
        )}

        {/* نموذج التقييم */}
        {showRating && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium text-center">كيف تقيّم جودة الدعم المقدم؟</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(i)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      i <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
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
}

function NewTicketDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createTicket = useCreateTicket();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createTicket.mutateAsync({ title, description, category, priority: 'medium' });
    setTitle(''); setDescription(''); setCategory('general');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>طلب دعم فني جديد</DialogTitle>
          <DialogDescription>صف المشكلة أو الطلب بالتفصيل</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="عنوان الطلب *" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="وصف تفصيلي للمشكلة..." value={description} onChange={e => setDescription(e.target.value)} />
          <NativeSelect value={category} onValueChange={setCategory} options={[
            { value: 'general', label: 'عام' },
            { value: 'technical', label: 'تقني' },
            { value: 'financial', label: 'مالي' },
            { value: 'account', label: 'حساب' },
            { value: 'suggestion', label: 'اقتراح' },
          ]} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button className="gradient-primary" onClick={handleSubmit} disabled={!title.trim() || createTicket.isPending}>
            {createTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال الطلب'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BeneficiarySupportPage;