/**
 * لوحة تتبع المستخدمين — المتواجدون الآن، ملخص النشاط، الخط الزمني لكل مستفيد.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Download, Users, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { fmtDateTime } from '@/utils/format/format';
import { downloadJson } from '@/lib/diagnostics/exporters';
import {
  useActiveSessions,
  useUserActivitySummary,
  useUserTimeline,
} from '@/hooks/data/audit/useUserTracking';

const fmtDuration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} ث`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} د`;
  return `${Math.floor(m / 60)} س ${m % 60} د`;
};

const EVENT_LABELS: Record<string, string> = {
  page_view: 'زيارة صفحة',
  page_exit: 'مغادرة صفحة',
  login_success: 'دخول ناجح',
  login_failed: 'دخول فاشل',
  logout: 'خروج',
  idle_logout: 'خروج بالخمول',
  session_expired: 'انتهاء الجلسة',
  role_fetch: 'قراءة الدور',
  client_error: 'خطأ في التطبيق',
  unauthorized_access: 'وصول غير مصرّح',
  insert: 'إضافة بيانات',
  update: 'تعديل بيانات',
  delete: 'حذف بيانات',
};

export default function UserTrackingPanel() {
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const sessions = useActiveSessions(15, true);
  const summary = useUserActivitySummary(days);
  const timeline = useUserTimeline(selected?.id ?? null, Math.max(days, 60));

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = summary.data ?? [];
    if (!q) return list;
    return list.filter((r) =>
      [r.email, r.display_name, r.roles, r.last_path].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [summary.data, search]);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="presence" dir="rtl">
        <TabsList>
          <TabsTrigger value="presence">👥 المتواجدون الآن</TabsTrigger>
          <TabsTrigger value="activity">📊 نشاط المستخدمين</TabsTrigger>
          <TabsTrigger value="timeline">🧭 الخط الزمني</TabsTrigger>
        </TabsList>

        <TabsContent value="presence">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                متواجدون خلال آخر 15 دقيقة: {sessions.data?.length ?? 0}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => void sessions.refetch()} disabled={sessions.isFetching}>
                <RefreshCw className={`h-4 w-4 ml-1 ${sessions.isFetching ? 'animate-spin' : ''}`} /> تحديث
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>المسار الحالي</TableHead>
                    <TableHead>آخر نشاط</TableHead>
                    <TableHead>الأحداث</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sessions.data ?? []).map((s) => (
                    <TableRow key={`${s.user_id}-${s.session_id ?? '-'}`}>
                      <TableCell className="font-medium">{s.display_name || s.email || s.user_id.slice(0, 8)}</TableCell>
                      <TableCell><Badge variant="secondary">{s.roles ?? '—'}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{s.current_path ?? '—'}</TableCell>
                      <TableCell className="text-xs">{fmtDateTime(s.last_activity)}</TableCell>
                      <TableCell>{s.events}</TableCell>
                      <TableCell className="font-mono text-xs">{s.ip_address ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {(sessions.data?.length ?? 0) === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">لا يوجد متواجدون حالياً</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> نشاط المستخدمين</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Input className="h-9 w-40" placeholder="بحث بالاسم/البريد" value={search} onChange={(e) => setSearch(e.target.value)} />
                {[7, 30, 90].map((d) => (
                  <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>{d} يوم</Button>
                ))}
                <Button size="sm" variant="outline" onClick={() => { downloadJson(rows, `user-activity-${days}d`); toast.success('تم تصدير سجل النشاط'); }}>
                  <Download className="h-4 w-4 ml-1" /> تصدير
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>جلسات</TableHead>
                    <TableHead>صفحات</TableHead>
                    <TableHead>أقسام</TableHead>
                    <TableHead>زمن الاستخدام</TableHead>
                    <TableHead>أخطاء</TableHead>
                    <TableHead>أول ظهور</TableHead>
                    <TableHead>آخر ظهور</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-medium">{r.display_name || r.email || r.user_id.slice(0, 8)}</TableCell>
                      <TableCell><Badge variant="secondary">{r.roles ?? '—'}</Badge></TableCell>
                      <TableCell>{r.sessions}</TableCell>
                      <TableCell>{r.page_views}</TableCell>
                      <TableCell>{r.distinct_paths}</TableCell>
                      <TableCell>{fmtDuration(Number(r.total_seconds ?? 0))}</TableCell>
                      <TableCell>{r.errors > 0 ? <Badge variant="destructive">{r.errors}</Badge> : '0'}</TableCell>
                      <TableCell className="text-xs">{fmtDateTime(r.first_seen)}</TableCell>
                      <TableCell className="text-xs">{fmtDateTime(r.last_seen)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setSelected({ id: r.user_id, name: r.display_name || r.email || r.user_id.slice(0, 8) })}>
                          تتبع
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">لا توجد بيانات نشاط في هذه الفترة</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
              <CardTitle className="text-base">
                {selected ? `الخط الزمني: ${selected.name}` : 'اختر مستخدماً من تبويب «نشاط المستخدمين»'}
              </CardTitle>
              {selected && (
                <Button size="sm" variant="outline" onClick={() => { downloadJson(timeline.data ?? [], `timeline-${selected.id}`); toast.success('تم تصدير الخط الزمني'); }}>
                  <Download className="h-4 w-4 ml-1" /> تصدير
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="text-sm text-muted-foreground">لا يوجد مستخدم محدد.</p>
              ) : (
                <div className="space-y-2 max-h-[540px] overflow-y-auto">
                  {(timeline.data ?? []).map((t, i) => (
                    <div key={`${t.occurred_at}-${i}`} className="flex items-start gap-3 border-b border-border pb-2">
                      <span className="text-xs text-muted-foreground w-36 shrink-0">{fmtDateTime(t.occurred_at)}</span>
                      <Badge variant={t.source === 'audit' ? 'default' : 'secondary'} className="shrink-0">
                        {EVENT_LABELS[t.event_type] ?? t.event_type}
                      </Badge>
                      <span className="text-sm flex-1">
                        <span className="font-mono text-xs">{t.target_path ?? '—'}</span>
                        {t.detail ? <span className="text-muted-foreground"> — {t.detail}</span> : null}
                      </span>
                      {t.ip_address && <span className="font-mono text-[11px] text-muted-foreground">{t.ip_address}</span>}
                    </div>
                  ))}
                  {(timeline.data?.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground py-4">لا توجد أحداث مسجّلة لهذا المستخدم في الفترة المحددة.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
