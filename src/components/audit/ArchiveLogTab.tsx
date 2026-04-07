import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Archive, Activity, CalendarDays } from 'lucide-react';
import { TablePagination, TableSkeleton } from '@/components/common';
import { fmtDate } from '@/utils/format/format';
import { useArchiveLog, ARCHIVE_ITEMS_PER_PAGE } from '@/hooks/data/audit/useArchiveLog';
import { eventConfig } from './auditEventConfig';

const ArchiveLogTab = () => {
  const [eventFilter, setEventFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: rawData, isLoading } = useArchiveLog(eventFilter, currentPage);
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Archive className="w-4 h-4" />إجمالي السجلات المؤرشفة</CardTitle></CardHeader>
          <CardContent><p className="text-xl sm:text-2xl font-bold">{totalCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CalendarDays className="w-4 h-4" />أحدث أرشفة</CardTitle></CardHeader>
          <CardContent><p className="text-sm font-medium">{logs[0] ? new Date(logs[0].archived_at).toLocaleString('ar-SA') : '—'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" />الصفحة الحالية</CardTitle></CardHeader>
          <CardContent><p className="text-sm font-medium">{currentPage} من {Math.max(1, Math.ceil(totalCount / ARCHIVE_ITEMS_PER_PAGE))}</p></CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input name="searchQuery" id="archive-log-tab-field-1" placeholder="بحث بالبريد أو المسار..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-9" />
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

      <Card>
        <CardContent className="p-0">
          {isLoading ? <TableSkeleton rows={5} cols={5} /> : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Archive className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p>لا توجد سجلات مؤرشفة</p>
              <p className="text-xs mt-1">يتم أرشفة سجلات الوصول التي تجاوز عمرها 6 أشهر تلقائياً</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 p-3 md:hidden">
                {filtered.map(log => {
                  const config = eventConfig[log.event_type] || { label: log.event_type, color: '', icon: Activity };
                  const Icon = config.icon;
                  return (
                    <div key={log.id} className="p-3 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={config.color} variant="outline"><Icon className="w-3 h-3 ml-1" />{config.label}</Badge>
                        <span className="text-[11px] text-muted-foreground shrink-0">{new Date(log.created_at).toLocaleString('ar-SA')}</span>
                      </div>
                      {log.email && <p className="text-xs font-mono" dir="ltr">{log.email}</p>}
                      {log.target_path && <p className="text-[11px] text-muted-foreground font-mono truncate" dir="ltr">{log.target_path}</p>}
                      <p className="text-[11px] text-muted-foreground">أرشفة: {fmtDate(log.archived_at)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="hidden md:block overflow-x-auto">
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
                          <TableCell className="text-sm text-muted-foreground">{fmtDate(log.archived_at)}</TableCell>
                          <TableCell><Badge className={config.color} variant="outline"><Icon className="w-3 h-3 ml-1" />{config.label}</Badge></TableCell>
                          <TableCell className="text-sm font-mono" dir="ltr">{log.email || '—'}</TableCell>
                          <TableCell className="text-sm font-mono" dir="ltr">{log.target_path || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.metadata ? JSON.stringify(log.metadata) : '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <TablePagination currentPage={currentPage} totalItems={totalCount} itemsPerPage={ARCHIVE_ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchiveLogTab;
