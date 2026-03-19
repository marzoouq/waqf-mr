/**
 * صفحة لوحة تحكم الدعم الفني — Orchestrator
 * يحتوي على الـ hooks والـ state ويمرر البيانات للمكونات الفرعية
 */
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Headset, Bug, BarChart3, Send, Loader2, CheckCircle, XCircle,
  ArrowUpCircle, Clock, Star,
} from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSupportTickets, useTicketReplies, useCreateTicket,
  useUpdateTicketStatus, useAddTicketReply, useClientErrors,
  useSupportStats, useSupportAnalytics, type SupportTicket,
} from '@/hooks/useSupportTickets';
import { toast } from 'sonner';

import SupportStatsCards from '@/components/support/SupportStatsCards';
import SupportTicketsTab from '@/components/support/SupportTicketsTab';
import SupportErrorsTab from '@/components/support/SupportErrorsTab';
import SupportAnalyticsTab from '@/components/support/SupportAnalyticsTab';

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

/** تصدير بيانات إلى CSV */
async function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  const { buildCsvFromRows, downloadCsv } = await import('@/utils/csv');
  const csv = buildCsvFromRows(headers, rows);
  downloadCsv(csv, filename);
  toast.success(`تم تصدير ${rows.length} سجل`);
}

const SupportDashboardPage = () => {
  const { role } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: ticketsData, isLoading } = useSupportTickets(statusFilter);
  const tickets = useMemo(() => ticketsData?.tickets ?? [], [ticketsData?.tickets]);
  const { data: stats } = useSupportStats();
  const { data: allTickets = [] } = useSupportAnalytics();
  const { data: errors = [] } = useClientErrors();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [errorSearch, setErrorSearch] = useState('');

  // === فلترة التذاكر ===
  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (categoryFilter !== 'all') result = result.filter(t => t.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.ticket_number.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q));
    }
    return result;
  }, [tickets, categoryFilter, searchQuery]);

  // === فلترة الأخطاء ===
  const filteredErrors = useMemo(() => {
    if (!errorSearch.trim()) return errors;
    const q = errorSearch.trim().toLowerCase();
    return errors.filter(err => {
      const meta = err.metadata as Record<string, string> | null;
      return (err.target_path ?? '').toLowerCase().includes(q) || (meta?.error_name ?? '').toLowerCase().includes(q) || (meta?.error_message ?? '').toLowerCase().includes(q);
    });
  }, [errors, errorSearch]);

  // === تصدير ===
  const handleExportTickets = useCallback(() => {
    const headers = ['الرقم', 'العنوان', 'التصنيف', 'الأولوية', 'الحالة', 'التاريخ'];
    const source = allTickets.length > 0 ? allTickets : filteredTickets;
    const rows = source.map(t => [
      t.ticket_number, t.title, CATEGORY_MAP[t.category] || t.category,
      PRIORITY_MAP[t.priority]?.label || t.priority, STATUS_MAP[t.status]?.label || t.status,
      new Date(t.created_at).toLocaleDateString('ar-SA'),
    ]);
    exportToCsv('support-tickets.csv', headers, rows);
  }, [allTickets, filteredTickets]);

  const handleExportErrors = useCallback(() => {
    const headers = ['التاريخ', 'الصفحة', 'الخطأ', 'المتصفح'];
    const rows = filteredErrors.map(err => {
      const meta = err.metadata as Record<string, string> | null;
      return [
        new Date(err.created_at).toLocaleString('ar-SA'), err.target_path ?? '',
        `${meta?.error_name ?? ''}: ${meta?.error_message ?? ''}`, (meta?.user_agent ?? '').slice(0, 80),
      ];
    });
    exportToCsv('client-errors.csv', headers, rows);
  }, [filteredErrors]);

  // === إحصائيات ===
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    allTickets.forEach(t => { map[t.category] = (map[t.category] || 0) + 1; });
    return Object.entries(map).map(([key, count]) => ({
      key, label: CATEGORY_MAP[key] || key, count,
      pct: allTickets.length > 0 ? Math.round((count / allTickets.length) * 100) : 0,
    }));
  }, [allTickets]);

  const priorityStats = useMemo(() => {
    const map: Record<string, number> = {};
    allTickets.forEach(t => { map[t.priority] = (map[t.priority] || 0) + 1; });
    return Object.entries(map).map(([key, count]) => ({
      key, label: PRIORITY_MAP[key]?.label || key, color: PRIORITY_MAP[key]?.color || '',
      count, pct: allTickets.length > 0 ? Math.round((count / allTickets.length) * 100) : 0,
    }));
  }, [allTickets]);

  const avgResolutionTime = useMemo(() => {
    const resolved = allTickets.filter(t => t.resolved_at);
    if (resolved.length === 0) return null;
    const totalHours = resolved.reduce((sum, t) => {
      return sum + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
    }, 0);
    const avg = totalHours / resolved.length;
    if (avg < 1) return `${Math.round(avg * 60)} دقيقة`;
    if (avg < 24) return `${Math.round(avg)} ساعة`;
    return `${Math.round(avg / 24)} يوم`;
  }, [allTickets]);

  const avgRating = useMemo(() => {
    const rated = allTickets.filter(t => t.rating);
    if (rated.length === 0) return null;
    const total = rated.reduce((sum, t) => sum + (t.rating ?? 0), 0);
    return { avg: (total / rated.length).toFixed(1), count: rated.length };
  }, [allTickets]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard
          title="مركز الدعم الفني"
          icon={Headset}
          description="إدارة التذاكر والأخطاء ومراقبة الأداء"
          actions={role === 'admin' ? (
            <Button onClick={() => setShowNewTicket(true)} className="gradient-primary">
              <Headset className="w-4 h-4 ml-2" />
              تذكرة جديدة
            </Button>
          ) : undefined}
        />

        <SupportStatsCards
          openTickets={stats?.openTickets ?? 0}
          inProgressTickets={stats?.inProgressTickets ?? 0}
          errorsLast24h={stats?.errorsLast24h ?? 0}
          resolvedTickets={stats?.resolvedTickets ?? 0}
          avgResolutionTime={avgResolutionTime}
          avgRating={avgRating}
        />

        <Tabs defaultValue="tickets" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="tickets" className="gap-1"><Headset className="w-4 h-4" />التذاكر</TabsTrigger>
            <TabsTrigger value="errors" className="gap-1"><Bug className="w-4 h-4" />الأخطاء</TabsTrigger>
            <TabsTrigger value="stats" className="gap-1"><BarChart3 className="w-4 h-4" />الإحصائيات</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets">
            <SupportTicketsTab
              filteredTickets={filteredTickets}
              isLoading={isLoading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onExport={handleExportTickets}
              onSelectTicket={setSelectedTicket}
            />
          </TabsContent>

          <TabsContent value="errors">
            <SupportErrorsTab
              filteredErrors={filteredErrors}
              errorSearch={errorSearch}
              setErrorSearch={setErrorSearch}
              onExport={handleExportErrors}
            />
          </TabsContent>

          <TabsContent value="stats">
            <SupportAnalyticsTab
              stats={stats}
              avgResolutionTime={avgResolutionTime}
              avgRating={avgRating}
              categoryStats={categoryStats}
              priorityStats={priorityStats}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* حوار عرض التذكرة */}
      {selectedTicket && (
        <TicketDetailDialog ticket={selectedTicket} onClose={() => setSelectedTicket(null)} isAdmin={role === 'admin'} />
      )}

      {/* حوار إنشاء تذكرة */}
      <NewTicketDialog open={showNewTicket} onClose={() => setShowNewTicket(false)} />
    </DashboardLayout>
  );
};

// === مكونات الحوارات (تبقى هنا لأنها خاصة بالصفحة) ===

function TicketDetailDialog({ ticket, onClose, isAdmin }: { ticket: SupportTicket; onClose: () => void; isAdmin: boolean }) {
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

  const s = STATUS_MAP[ticket.status] || STATUS_MAP.open;
  const p = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.medium;
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
                  <Star key={i} className={`w-4 h-4 ${i <= ticket.rating! ? 'fill-star-rating text-star-rating' : 'text-muted-foreground/30'}`} />
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
          <Textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="اكتب رداً..." className="flex-1 min-h-[60px]" />
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

function NewTicketDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createTicket = useCreateTicket();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createTicket.mutateAsync({ title, description, category, priority });
    setTitle(''); setDescription(''); setCategory('general'); setPriority('medium');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>تذكرة دعم فني جديدة</DialogTitle>
          <DialogDescription>أدخل تفاصيل المشكلة أو الطلب</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="عنوان التذكرة *" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="وصف تفصيلي..." value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <NativeSelect value={category} onValueChange={setCategory} options={[
              { value: 'general', label: 'عام' }, { value: 'technical', label: 'تقني' },
              { value: 'financial', label: 'مالي' }, { value: 'account', label: 'حساب' },
              { value: 'suggestion', label: 'اقتراح' },
            ]} />
            <NativeSelect value={priority} onValueChange={setPriority} options={[
              { value: 'low', label: 'منخفض' }, { value: 'medium', label: 'متوسط' },
              { value: 'high', label: 'عالي' }, { value: 'critical', label: 'حرج' },
            ]} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button className="gradient-primary" onClick={handleSubmit} disabled={!title.trim() || createTicket.isPending}>
            {createTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء التذكرة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SupportDashboardPage;
