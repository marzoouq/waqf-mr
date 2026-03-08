/**
 * صفحة الدعم الفني للمستفيد — تقديم ومتابعة تذاكر الدعم
 */
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Headset, CheckCircle, Clock, Send, Loader2, MessageSquare, XCircle, ArrowUpCircle, Eye, Plus,
} from 'lucide-react';
import { useState } from 'react';
import {
  useSupportTickets, useTicketReplies, useCreateTicket,
  useAddTicketReply, type SupportTicket,
} from '@/hooks/useSupportTickets';

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'مفتوح', color: 'bg-blue-500/20 text-blue-600', icon: Clock },
  in_progress: { label: 'قيد المعالجة', color: 'bg-warning/20 text-warning', icon: ArrowUpCircle },
  resolved: { label: 'تم الحل', color: 'bg-success/20 text-success', icon: CheckCircle },
  closed: { label: 'مغلق', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const BeneficiarySupportPage = () => {
  const { data: tickets = [], isLoading } = useSupportTickets();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center shadow-gold">
              <Headset className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">الدعم الفني</h1>
              <p className="text-sm text-muted-foreground">تقديم ومتابعة طلبات الدعم</p>
            </div>
          </div>
          <Button onClick={() => setShowNewTicket(true)} className="gradient-primary">
            <Plus className="w-4 h-4 ml-2" />
            طلب دعم جديد
          </Button>
        </div>

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

      {/* تفاصيل التذكرة */}
      {selectedTicket && (
        <TicketViewDialog ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {/* تذكرة جديدة */}
      <NewTicketDialog open={showNewTicket} onClose={() => setShowNewTicket(false)} />
    </DashboardLayout>
  );
};

function TicketViewDialog({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const { data: replies = [], isLoading } = useTicketReplies(ticket.id);
  const addReply = useAddTicketReply();
  const [replyContent, setReplyContent] = useState('');

  const handleSend = async () => {
    if (!replyContent.trim()) return;
    await addReply.mutateAsync({ ticket_id: ticket.id, content: replyContent });
    setReplyContent('');
  };

  const s = STATUS_MAP[ticket.status] || STATUS_MAP.open;

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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="التصنيف" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">عام</SelectItem>
              <SelectItem value="technical">تقني</SelectItem>
              <SelectItem value="financial">مالي</SelectItem>
              <SelectItem value="account">حساب</SelectItem>
              <SelectItem value="suggestion">اقتراح</SelectItem>
            </SelectContent>
          </Select>
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
