import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, XCircle, LogOut, Search, Archive, Activity, CalendarDays } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TablePagination from '@/components/TablePagination';

const ITEMS_PER_PAGE = 15;

interface ArchiveLogEntry {
  id: string;
  event_type: string;
  email: string | null;
  user_id: string | null;
  device_info: string | null;
  target_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  archived_at: string;
}

const eventConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  login_failed: { label: 'فشل تسجيل الدخول', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: XCircle },
  login_success: { label: 'تسجيل دخول ناجح', color: 'bg-success/15 text-success border-success/30', icon: CheckCircle },
  unauthorized_access: { label: 'وصول غير مصرح', color: 'bg-warning/15 text-warning border-warning/30', icon: AlertTriangle },
  idle_logout: { label: 'خروج تلقائي', color: 'bg-info/15 text-info border-info/30', icon: LogOut },
};

const ArchiveLogTab = () => {
  const [eventFilter, setEventFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Server-side pagination with count (FIX B-02)
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['access_log_archive', eventFilter, currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      let query = supabase
        .from('access_log_archive')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + ITEMS_PER_PAGE - 1);

      if (eventFilter !== 'all') {
        query = query.eq('event_type', eventFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: (data || []) as unknown as ArchiveLogEntry[], totalCount: count ?? 0 };
    },
  });

  const logs = rawData?.logs ?? [];
  const totalCount = rawData?.totalCount ?? 0;

  // Client-side search on current page only (lightweight)
  const filtered = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(l =>
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.target_path && l.target_path.toLowerCase().includes(q)) ||
      (l.device_info && l.device_info.toLowerCase().includes(q))
    );
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Archive className="w-4 h-4" />إجمالي السجلات المؤرشفة
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />أحدث أرشفة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {logs[0] ? new Date(logs[0].archived_at).toLocaleString('ar-SA') : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />الصفحة الحالية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {currentPage} من {Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالبريد أو المسار..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pr-9"
          />
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
            <div className="p-8 text-center text-muted-foreground">
              <Archive className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p>لا توجد سجلات مؤرشفة</p>
              <p className="text-xs mt-1">يتم أرشفة سجلات الوصول التي تجاوز عمرها 6 أشهر تلقائياً</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاريخ الحدث</TableHead>
                    <TableHead className="text-right">تاريخ الأرشفة</TableHead>
                    <TableHead className="text-right">نوع الحدث</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">المسار</TableHead>
                    <TableHead className="text-right">تفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(log => {
                    const config = eventConfig[log.event_type] || { label: log.event_type, color: '', icon: Activity };
                    const Icon = config.icon;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{new Date(log.created_at).toLocaleString('ar-SA')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(log.archived_at).toLocaleDateString('ar-SA')}</TableCell>
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

export default ArchiveLogTab;
