/**
 * تبويب التذاكر — بحث + فلاتر + جدول
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Search, Filter, Download, Eye, Loader2, Clock, ArrowUpCircle, CheckCircle, XCircle, Star } from 'lucide-react';
import type { SupportTicket } from '@/hooks/useSupportTickets';

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفض', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'متوسط', color: 'bg-warning/20 text-warning' },
  high: { label: 'عالي', color: 'bg-caution/20 text-caution-foreground' },
  critical: { label: 'حرج', color: 'bg-destructive/20 text-destructive' },
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'مفتوح', color: 'bg-status-approved/20 text-status-approved-foreground', icon: Clock },
  in_progress: { label: 'قيد المعالجة', color: 'bg-warning/20 text-warning', icon: ArrowUpCircle },
  resolved: { label: 'تم الحل', color: 'bg-success/20 text-success', icon: CheckCircle },
  closed: { label: 'مغلق', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const CATEGORY_MAP: Record<string, string> = {
  general: 'عام', technical: 'تقني', financial: 'مالي', account: 'حساب', suggestion: 'اقتراح',
};

const SLA_HOURS: Record<string, number> = { critical: 4, high: 12, medium: 24, low: 48 };

function SlaIndicator({ ticket }: { ticket: SupportTicket }) {
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    return <span className="text-xs text-success">✓ مُغلق</span>;
  }
  const slaHours = SLA_HOURS[ticket.priority] ?? 24;
  const deadline = new Date(ticket.created_at).getTime() + slaHours * 60 * 60 * 1000;
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    const hours = Math.floor(Math.abs(remaining) / (1000 * 60 * 60));
    return <span className="text-xs text-destructive font-medium">⏰ متأخر {hours > 0 ? `${hours} س` : 'الآن'}</span>;
  }
  const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));
  const minsLeft = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const isUrgent = remaining < 2 * 60 * 60 * 1000;
  return (
    <span className={`text-xs font-medium ${isUrgent ? 'text-warning' : 'text-muted-foreground'}`}>
      {hoursLeft > 0 ? `${hoursLeft} س` : ''} {minsLeft} د
    </span>
  );
}

interface SupportTicketsTabProps {
  filteredTickets: SupportTicket[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  onExport: () => void;
  onSelectTicket: (t: SupportTicket) => void;
}

export default function SupportTicketsTab({
  filteredTickets, isLoading, searchQuery, setSearchQuery,
  categoryFilter, setCategoryFilter, statusFilter, setStatusFilter,
  onExport, onSelectTicket,
}: SupportTicketsTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            تذاكر الدعم
            <span className="text-sm font-normal text-muted-foreground">({filteredTickets.length})</span>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="بحث بالعنوان أو الرقم..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-8 w-[180px]" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التصنيفات</SelectItem>
                <SelectItem value="general">عام</SelectItem>
                <SelectItem value="technical">تقني</SelectItem>
                <SelectItem value="financial">مالي</SelectItem>
                <SelectItem value="account">حساب</SelectItem>
                <SelectItem value="suggestion">اقتراح</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="open">مفتوح</SelectItem>
                  <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                  <SelectItem value="resolved">تم الحل</SelectItem>
                  <SelectItem value="closed">مغلق</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" onClick={onExport} disabled={filteredTickets.length === 0}>
              <Download className="w-4 h-4 ml-1" />
              تصدير
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filteredTickets.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {searchQuery || categoryFilter !== 'all' ? 'لا توجد تذاكر مطابقة للبحث' : 'لا توجد تذاكر'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">الرقم</TableHead>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-right">الأولوية</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">SLA</TableHead>
                <TableHead className="text-right">التقييم</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map(ticket => {
                const s = STATUS_MAP[ticket.status] || STATUS_MAP.open;
                const p = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.medium;
                const Icon = s.icon;
                return (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-xs">{ticket.ticket_number}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{ticket.title}</TableCell>
                    <TableCell>{CATEGORY_MAP[ticket.category] || ticket.category}</TableCell>
                    <TableCell><Badge className={p.color}>{p.label}</Badge></TableCell>
                    <TableCell><Badge className={s.color}><Icon className="w-3 h-3 ml-1" />{s.label}</Badge></TableCell>
                    <TableCell><SlaIndicator ticket={ticket} /></TableCell>
                    <TableCell>
                      {ticket.rating ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} className={`w-3 h-3 ${i <= ticket.rating! ? 'fill-star-rating text-star-rating' : 'text-muted-foreground/30'}`} />
                          ))}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs">{new Date(ticket.created_at).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => onSelectTicket(ticket)}>
                        <Eye className="w-3 h-3 ml-1" />
                        عرض
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
  );
}
