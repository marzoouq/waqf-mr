/**
 * صفحة لوحة تحكم الدعم الفني — للناظر والمحاسب
 * تشمل: تذاكر الدعم، سجل الأخطاء التلقائية، إحصائيات الأداء
 * v2.7: بحث نصي + تصدير CSV + فلترة تصنيف + إحصائيات متقدمة
 */
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Headset, Bug, BarChart3, AlertTriangle, CheckCircle, Clock, Send,
  Loader2, MessageSquare, XCircle, ArrowUpCircle, Filter, Eye,
  Search, Download, TrendingUp, TrendingDown, Activity,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSupportTickets, useTicketReplies, useCreateTicket,
  useUpdateTicketStatus, useAddTicketReply, useClientErrors,
  useSupportStats, type SupportTicket,
} from '@/hooks/useSupportTickets';
import { toast } from 'sonner';

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفض', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'متوسط', color: 'bg-warning/20 text-warning' },
  high: { label: 'عالي', color: 'bg-orange-500/20 text-orange-600' },
  critical: { label: 'حرج', color: 'bg-destructive/20 text-destructive' },
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'مفتوح', color: 'bg-blue-500/20 text-blue-600', icon: Clock },
  in_progress: { label: 'قيد المعالجة', color: 'bg-warning/20 text-warning', icon: ArrowUpCircle },
  resolved: { label: 'تم الحل', color: 'bg-success/20 text-success', icon: CheckCircle },
  closed: { label: 'مغلق', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const CATEGORY_MAP: Record<string, string> = {
  general: 'عام',
  technical: 'تقني',
  financial: 'مالي',
  account: 'حساب',
  suggestion: 'اقتراح',
};

/** تصدير بيانات إلى CSV */
function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  const BOM = '\uFEFF';
  const csv = BOM + [headers.join(','), ...rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`تم تصدير ${rows.length} سجل`);
}

const SupportDashboardPage = () => {
  const { user, role } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: ticketsData, isLoading } = useSupportTickets(statusFilter);
  const tickets = ticketsData?.tickets ?? [];
  const { data: stats } = useSupportStats();
  const { data: errors = [] } = useClientErrors();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [errorSearch, setErrorSearch] = useState('');

  // === فلترة التذاكر محلياً (بحث + تصنيف) ===
  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.ticket_number.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, categoryFilter, searchQuery]);

  // === فلترة الأخطاء ===
  const filteredErrors = useMemo(() => {
    if (!errorSearch.trim()) return errors;
    const q = errorSearch.trim().toLowerCase();
    return errors.filter(err => {
      const meta = err.metadata as Record<string, string> | null;
      return (
        (err.target_path ?? '').toLowerCase().includes(q) ||
        (meta?.error_name ?? '').toLowerCase().includes(q) ||
        (meta?.error_message ?? '').toLowerCase().includes(q)
      );
    });
  }, [errors, errorSearch]);

  // === تصدير التذاكر ===
  const handleExportTickets = useCallback(() => {
    const headers = ['الرقم', 'العنوان', 'التصنيف', 'الأولوية', 'الحالة', 'التاريخ'];
    const rows = filteredTickets.map(t => [
      t.ticket_number,
      t.title,
      CATEGORY_MAP[t.category] || t.category,
      PRIORITY_MAP[t.priority]?.label || t.priority,
      STATUS_MAP[t.status]?.label || t.status,
      new Date(t.created_at).toLocaleDateString('ar-SA'),
    ]);
    exportToCsv('support-tickets.csv', headers, rows);
  }, [filteredTickets]);

  // === تصدير الأخطاء ===
  const handleExportErrors = useCallback(() => {
    const headers = ['التاريخ', 'الصفحة', 'الخطأ', 'المتصفح'];
    const rows = filteredErrors.map(err => {
      const meta = err.metadata as Record<string, string> | null;
      return [
        new Date(err.created_at).toLocaleString('ar-SA'),
        err.target_path ?? '',
        `${meta?.error_name ?? ''}: ${meta?.error_message ?? ''}`,
        (meta?.user_agent ?? '').slice(0, 80),
      ];
    });
    exportToCsv('client-errors.csv', headers, rows);
  }, [filteredErrors]);

  // === إحصائيات التصنيف ===
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    tickets.forEach(t => {
      map[t.category] = (map[t.category] || 0) + 1;
    });
    return Object.entries(map).map(([key, count]) => ({
      key,
      label: CATEGORY_MAP[key] || key,
      count,
      pct: tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0,
    }));
  }, [tickets]);

  // === إحصائيات الأولوية ===
  const priorityStats = useMemo(() => {
    const map: Record<string, number> = {};
    tickets.forEach(t => {
      map[t.priority] = (map[t.priority] || 0) + 1;
    });
    return Object.entries(map).map(([key, count]) => ({
      key,
      label: PRIORITY_MAP[key]?.label || key,
      color: PRIORITY_MAP[key]?.color || '',
      count,
      pct: tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0,
    }));
  }, [tickets]);

  // === حساب متوسط وقت الحل (SLA بسيط) ===
  const avgResolutionTime = useMemo(() => {
    const resolved = tickets.filter(t => t.resolved_at);
    if (resolved.length === 0) return null;
    const totalHours = resolved.reduce((sum, t) => {
      const created = new Date(t.created_at).getTime();
      const resolvedAt = new Date(t.resolved_at!).getTime();
      return sum + (resolvedAt - created) / (1000 * 60 * 60);
    }, 0);
    const avg = totalHours / resolved.length;
    if (avg < 1) return `${Math.round(avg * 60)} دقيقة`;
    if (avg < 24) return `${Math.round(avg)} ساعة`;
    return `${Math.round(avg / 24)} يوم`;
  }, [tickets]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center shadow-gold">
              <Headset className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">مركز الدعم الفني</h1>
              <p className="text-sm text-muted-foreground">إدارة التذاكر والأخطاء ومراقبة الأداء</p>
            </div>
          </div>
          {role === 'admin' && (
            <Button onClick={() => setShowNewTicket(true)} className="gradient-primary">
              <Headset className="w-4 h-4 ml-2" />
              تذكرة جديدة
            </Button>
          )}
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Clock} label="مفتوحة" value={stats?.openTickets ?? 0} color="text-blue-600" />
          <StatCard icon={ArrowUpCircle} label="قيد المعالجة" value={stats?.inProgressTickets ?? 0} color="text-warning" />
          <StatCard icon={Bug} label="أخطاء 24 ساعة" value={stats?.errorsLast24h ?? 0} color="text-destructive" />
          <StatCard icon={CheckCircle} label="تم حلها" value={stats?.resolvedTickets ?? 0} color="text-success" />
          <StatCard icon={Activity} label="متوسط الحل" value={avgResolutionTime ?? '—'} color="text-primary" isText />
        </div>

        <Tabs defaultValue="tickets" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="tickets" className="gap-1">
              <Headset className="w-4 h-4" />
              التذاكر
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-1">
              <Bug className="w-4 h-4" />
              الأخطاء
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1">
              <BarChart3 className="w-4 h-4" />
              الإحصائيات
            </TabsTrigger>
          </TabsList>

          {/* === تبويب التذاكر === */}
          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    تذاكر الدعم
                    <span className="text-sm font-normal text-muted-foreground">({filteredTickets.length})</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* بحث */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute right-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="بحث بالعنوان أو الرقم..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pr-8 w-[180px]"
                      />
                    </div>
                    {/* فلتر التصنيف */}
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل التصنيفات</SelectItem>
                        <SelectItem value="general">عام</SelectItem>
                        <SelectItem value="technical">تقني</SelectItem>
                        <SelectItem value="financial">مالي</SelectItem>
                        <SelectItem value="account">حساب</SelectItem>
                        <SelectItem value="suggestion">اقتراح</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* فلتر الحالة */}
                    <div className="flex items-center gap-1">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل الحالات</SelectItem>
                          <SelectItem value="open">مفتوح</SelectItem>
                          <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                          <SelectItem value="resolved">تم الحل</SelectItem>
                          <SelectItem value="closed">مغلق</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* تصدير */}
                    <Button size="sm" variant="outline" onClick={handleExportTickets} disabled={filteredTickets.length === 0}>
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
                            <TableCell>
                              <Badge className={s.color}>
                                <Icon className="w-3 h-3 ml-1" />{s.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{new Date(ticket.created_at).toLocaleDateString('ar-SA')}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => setSelectedTicket(ticket)}>
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
          </TabsContent>

          {/* === تبويب الأخطاء === */}
          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Bug className="w-5 h-5 text-destructive" />
                    سجل الأخطاء التلقائية
                    <span className="text-sm font-normal text-muted-foreground">({filteredErrors.length})</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute right-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="بحث في الأخطاء..."
                        value={errorSearch}
                        onChange={e => setErrorSearch(e.target.value)}
                        className="pr-8 w-[180px]"
                      />
                    </div>
                    <Button size="sm" variant="outline" onClick={handleExportErrors} disabled={filteredErrors.length === 0}>
                      <Download className="w-4 h-4 ml-1" />
                      تصدير
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredErrors.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      {errorSearch ? 'لا توجد أخطاء مطابقة للبحث' : 'لا توجد أخطاء مسجلة — التطبيق يعمل بشكل سليم'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الصفحة</TableHead>
                        <TableHead className="text-right">الخطأ</TableHead>
                        <TableHead className="text-right">المتصفح</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredErrors.map(err => {
                        const meta = err.metadata as Record<string, string> | null;
                        return (
                          <TableRow key={err.id}>
                            <TableCell className="text-xs">{new Date(err.created_at).toLocaleString('ar-SA')}</TableCell>
                            <TableCell className="font-mono text-xs max-w-[150px] truncate" dir="ltr">{err.target_path || '—'}</TableCell>
                            <TableCell className="max-w-[250px]">
                              <div className="text-xs text-destructive font-mono truncate" dir="ltr">
                                {meta?.error_name}: {meta?.error_message}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate" dir="ltr">
                              {meta?.user_agent?.slice(0, 50) || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === تبويب الإحصائيات المتقدمة === */}
          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ملخص التذاكر */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    ملخص التذاكر
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="إجمالي التذاكر" value={stats?.totalTickets ?? 0} />
                  <StatRow label="مفتوحة" value={stats?.openTickets ?? 0} color="text-blue-600" />
                  <StatRow label="قيد المعالجة" value={stats?.inProgressTickets ?? 0} color="text-warning" />
                  <StatRow label="تم حلها" value={stats?.resolvedTickets ?? 0} color="text-success" />
                  <StatRow label="أولوية عالية/حرجة" value={stats?.highPriorityTickets ?? 0} color="text-destructive" />
                  <StatRow label="تذاكر آخر 7 أيام" value={stats?.ticketsLast7d ?? 0} />
                  {avgResolutionTime && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" />
                          متوسط وقت الحل
                        </span>
                        <span className="font-bold text-primary">{avgResolutionTime}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ملخص الأخطاء */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    ملخص الأخطاء
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="إجمالي الأخطاء المسجلة" value={stats?.totalErrors ?? 0} />
                  <StatRow label="أخطاء آخر 24 ساعة" value={stats?.errorsLast24h ?? 0} color={stats?.errorsLast24h ? 'text-destructive' : undefined} />
                  <StatRow label="أخطاء آخر 7 أيام" value={stats?.errorsLast7d ?? 0} color={stats?.errorsLast7d ? 'text-warning' : undefined} />
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2">
                      {(stats?.errorsLast24h ?? 0) === 0 ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-success" />
                          <span className="text-sm text-success">حالة النظام: سليم</span>
                        </>
                      ) : (stats?.errorsLast24h ?? 0) <= 3 ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-warning" />
                          <span className="text-sm text-warning">يوجد أخطاء قليلة تحتاج مراجعة</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          <span className="text-sm text-destructive">يوجد أخطاء متكررة — تحتاج تدخل فوري</span>
                        </>
                      )}
                    </div>
                    {(stats?.errorsLast24h ?? 0) > 0 && (stats?.errorsLast7d ?? 0) > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        {(stats?.errorsLast24h ?? 0) > ((stats?.errorsLast7d ?? 0) / 7) ? (
                          <>
                            <TrendingUp className="w-3 h-3 text-destructive" />
                            <span>معدل الأخطاء في ارتفاع</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-3 h-3 text-success" />
                            <span>معدل الأخطاء في انخفاض</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* توزيع التصنيفات */}
              {categoryStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      توزيع التذاكر حسب التصنيف
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {categoryStats.map(cat => (
                      <div key={cat.key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{cat.label}</span>
                          <span className="font-medium">{cat.count} ({cat.pct}%)</span>
                        </div>
                        <Progress value={cat.pct} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* توزيع الأولويات */}
              {priorityStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      توزيع التذاكر حسب الأولوية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {priorityStats.map(p => (
                      <div key={p.key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <Badge className={p.color}>{p.label}</Badge>
                          <span className="font-medium">{p.count} ({p.pct}%)</span>
                        </div>
                        <Progress value={p.pct} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* حوار عرض التذكرة */}
      {selectedTicket && (
        <TicketDetailDialog
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          isAdmin={role === 'admin'}
        />
      )}

      {/* حوار إنشاء تذكرة جديدة */}
      <NewTicketDialog open={showNewTicket} onClose={() => setShowNewTicket(false)} />
    </DashboardLayout>
  );
};

// === مكونات مساعدة ===

function StatCard({ icon: Icon, label, value, color, isText }: { icon: typeof Clock; label: string; value: number | string; color: string; isText?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-8 h-8 ${color}`} />
        <div>
          <p className={`${isText ? 'text-lg' : 'text-2xl'} font-bold`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-bold ${color || ''}`}>{value}</span>
    </div>
  );
}

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
    updateStatus.mutate({
      id: ticket.id,
      status: newStatus,
      resolution_notes: newStatus === 'resolved' ? resolutionNotes : undefined,
    });
  };

  const s = STATUS_MAP[ticket.status] || STATUS_MAP.open;
  const p = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.medium;

  // حساب عمر التذكرة
  const ageMs = Date.now() - new Date(ticket.created_at).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageLabel = ageHours < 1 ? `${Math.round(ageHours * 60)} دقيقة` : ageHours < 24 ? `${Math.round(ageHours)} ساعة` : `${Math.round(ageHours / 24)} يوم`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headset className="w-5 h-5" />
            تذكرة: {ticket.ticket_number}
          </DialogTitle>
          <DialogDescription>{ticket.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 px-1">
          <Badge className={s.color}>{s.label}</Badge>
          <Badge className={p.color}>{p.label}</Badge>
          <Badge variant="outline">{CATEGORY_MAP[ticket.category] || ticket.category}</Badge>
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 ml-1" />
            عمر التذكرة: {ageLabel}
          </Badge>
        </div>

        {ticket.description && (
          <div className="bg-muted/50 rounded-md p-3 text-sm">{ticket.description}</div>
        )}

        {ticket.resolution_notes && (
          <div className="bg-success/10 border border-success/20 rounded-md p-3 text-sm">
            <span className="font-medium text-success">ملاحظات الحل:</span> {ticket.resolution_notes}
          </div>
        )}

        {/* الردود */}
        <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
          <div className="space-y-3 p-1">
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : replies.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">لا توجد ردود بعد</p>
            ) : (
              replies.map(reply => (
                <div key={reply.id} className={`rounded-lg p-3 text-sm ${reply.is_internal ? 'bg-warning/10 border border-warning/20' : 'bg-muted/50'}`}>
                  <p>{reply.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(reply.created_at).toLocaleString('ar-SA')}
                    {reply.is_internal && ' — ملاحظة داخلية'}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* إضافة رد */}
        <div className="flex gap-2">
          <Textarea
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            placeholder="اكتب رداً..."
            className="flex-1 min-h-[60px]"
          />
          <Button size="icon" onClick={handleSendReply} disabled={!replyContent.trim() || addReply.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* إجراءات الناظر */}
        {isAdmin && ticket.status !== 'closed' && (
          <DialogFooter className="flex-wrap gap-2">
            {ticket.status === 'open' && (
              <Button variant="outline" onClick={() => handleStatusChange('in_progress')} disabled={updateStatus.isPending}>
                بدء المعالجة
              </Button>
            )}
            {(ticket.status === 'open' || ticket.status === 'in_progress') && (
              <>
                <Input
                  placeholder="ملاحظات الحل..."
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <Button className="gradient-primary" onClick={() => handleStatusChange('resolved')} disabled={updateStatus.isPending}>
                  <CheckCircle className="w-4 h-4 ml-1" />
                  تم الحل
                </Button>
              </>
            )}
            {ticket.status === 'resolved' && (
              <Button variant="outline" onClick={() => handleStatusChange('closed')} disabled={updateStatus.isPending}>
                إغلاق نهائي
              </Button>
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
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue placeholder="الأولوية" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">منخفض</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="high">عالي</SelectItem>
                <SelectItem value="critical">حرج</SelectItem>
              </SelectContent>
            </Select>
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
