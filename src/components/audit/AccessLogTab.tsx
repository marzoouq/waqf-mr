import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XCircle, Search, ShieldAlert, Activity } from 'lucide-react';
import { TablePagination } from '@/components/common';
import { useAccessLogTab, useFailedLoginsToday, useUnauthorizedAccessToday, ACCESS_LOG_ITEMS_PER_PAGE } from '@/hooks/data/audit/useAccessLogTab';
import { useDebouncedValue } from '@/hooks/ui/useDebouncedValue';
import { eventConfig } from './auditEventConfig';

const AccessLogTab = () => {
  const [eventFilter, setEventFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // إعادة تعيين الصفحة عند تغير البحث المُؤجَّل
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when debounced search changes
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch]);

  const { data: rawData, isLoading } = useAccessLogTab(eventFilter, currentPage, debouncedSearch);
  const { data: failedToday = 0 } = useFailedLoginsToday();
  const { data: unauthorizedToday = 0 } = useUnauthorizedAccessToday();

  const logs = useMemo(() => rawData?.logs ?? [], [rawData?.logs]);
  const totalCount = rawData?.totalCount ?? 0;

  const filtered = logs;
  const paginated = filtered;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />إجمالي الأحداث
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-xl sm:text-2xl font-bold">{totalCount}</p></CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <XCircle className="w-4 h-4" />محاولات دخول فاشلة اليوم
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-xl sm:text-2xl font-bold text-destructive">{failedToday}</p></CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-warning flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />وصول غير مصرح اليوم
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-xl sm:text-2xl font-bold text-warning">{unauthorizedToday}</p></CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input name="searchQuery" id="access-log-tab-field-1" placeholder="بحث في كامل السجلات (بريد، مسار، جهاز)..." title="بحث خادمي عبر كل سجلات الوصول — يُؤجَّل 300ms أثناء الكتابة" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-9" />
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
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">لا توجد سجلات</div>
          ) : (
            <>
              <div className="space-y-2 p-3 md:hidden">
                {paginated.map(log => {
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
                    </div>
                  );
                })}
              </div>
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
              <TablePagination currentPage={currentPage} totalItems={totalCount} itemsPerPage={ACCESS_LOG_ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessLogTab;
