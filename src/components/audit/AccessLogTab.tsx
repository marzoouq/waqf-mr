import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, XCircle, LogOut, Search, ShieldAlert, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TablePagination from '@/components/TablePagination';

const ITEMS_PER_PAGE = 15;

interface AccessLogEntry {
  id: string;
  event_type: string;
  email: string | null;
  user_id: string | null;
  device_info: string | null;
  target_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const eventConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  login_failed: { label: 'فشل تسجيل الدخول', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
  login_success: { label: 'تسجيل دخول ناجح', color: 'bg-success/15 text-success border-success/30', icon: CheckCircle },
  unauthorized_access: { label: 'وصول غير مصرح', color: 'bg-warning/15 text-warning border-warning/30', icon: AlertTriangle },
  idle_logout: { label: 'خروج تلقائي', color: 'bg-info/15 text-info border-info/30', icon: LogOut },
};

const AccessLogTab = () => {
  const [eventFilter, setEventFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['access_log', eventFilter, currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      let query = supabase
        .from('access_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + ITEMS_PER_PAGE - 1);

      if (eventFilter !== 'all') {
        query = query.eq('event_type', eventFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: (data || []) as unknown as AccessLogEntry[], totalCount: count ?? 0 };
    },
  });

  const logs = useMemo(() => rawData?.logs ?? [], [rawData?.logs]);
  const totalCount = rawData?.totalCount ?? 0;

  const filtered = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(l =>
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.target_path && l.target_path.toLowerCase().includes(q)) ||
      (l.device_info && l.device_info.toLowerCase().includes(q))
    );
  }, [logs, searchQuery]);

  // Server-side pagination — no client-side slicing needed
  const paginated = filtered;

  // Stats use separate lightweight COUNT queries
  const { data: failedToday = 0 } = useQuery({
    queryKey: ['access_log_failed_today'],
    staleTime: 30_000,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('access_log')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'login_failed')
        .gte('created_at', todayStr);
      return count ?? 0;
    },
  });
  const { data: unauthorizedToday = 0 } = useQuery({
    queryKey: ['access_log_unauthorized_today'],
    staleTime: 30_000,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('access_log')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'unauthorized_access')
        .gte('created_at', todayStr);
      return count ?? 0;
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />إجمالي الأحداث
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalCount}</p></CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <XCircle className="w-4 h-4" />محاولات دخول فاشلة اليوم
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{failedToday}</p></CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-warning flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />وصول غير مصرح اليوم
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-warning">{unauthorizedToday}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالبريد أو المسار..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-9" />
        </div>
        <Select value={eventFilter} onValueChange={v => { setEventFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="نوع الحدث" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأحداث</SelectItem>
            <SelectItem value="login_failed">فشل تسجيل الدخول</SelectItem>
            <SelectItem value="login_success">تسجيل دخول ناجح</SelectItem>
            <SelectItem value="unauthorized_access">وصول غير مصرح</SelectItem>
            <SelectItem value="idle_logout">خروج تلقائي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">لا توجد سجلات</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 p-3 md:hidden">
                {paginated.map(log => {
                  const config = eventConfig[log.event_type] || { label: log.event_type, color: '', icon: Activity };
                  const Icon = config.icon;
                  return (
                    <div key={log.id} className="p-3 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={config.color} variant="outline">
                          <Icon className="w-3 h-3 ml-1" />
                          {config.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {new Date(log.created_at).toLocaleString('ar-SA')}
                        </span>
                      </div>
                      {log.email && <p className="text-xs font-mono" dir="ltr">{log.email}</p>}
                      {log.target_path && <p className="text-[11px] text-muted-foreground font-mono truncate" dir="ltr">{log.target_path}</p>}
                    </div>
                  );
                })}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">التاريخ والوقت</TableHead>
                      <TableHead className="text-right">نوع الحدث</TableHead>
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">المسار</TableHead>
                      <TableHead className="text-right">تفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map(log => {
                      const config = eventConfig[log.event_type] || { label: log.event_type, color: '', icon: Activity };
                      const Icon = config.icon;
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{new Date(log.created_at).toLocaleString('ar-SA')}</TableCell>
                          <TableCell>
                            <Badge className={config.color} variant="outline">
                              <Icon className="w-3 h-3 ml-1" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-mono" dir="ltr">{log.email || '—'}</TableCell>
                          <TableCell className="text-sm font-mono" dir="ltr">{log.target_path || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {log.metadata ? JSON.stringify(log.metadata) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={currentPage}
                totalItems={totalCount}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessLogTab;
