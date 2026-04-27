/**
 * EmailMonitorPage — لوحة مراقبة نظام البريد الإلكتروني
 * - متاحة للمسؤولين (admin) فقط
 * - تعرض: آخر تشغيل، إحصاءات (sent/failed/dlq/suppressed)، قائمة الرسائل، زر إعادة محاولة DLQ
 * - فلاتر: نطاق زمني (24h/7d/30d/custom)، نوع القالب، الحالة
 */
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  RefreshCw, Mail, CheckCircle2, AlertTriangle, XCircle, ShieldOff,
  Clock, AlertOctagon, Inbox, RotateCcw,
} from 'lucide-react';
import { useEmailMonitorPage, type EmailRange, type EmailStatusFilter } from '@/hooks/page/admin/management/useEmailMonitorPage';
import { cn } from '@/lib/cn';

const STATUS_BADGE: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  sent: { label: 'مُرسلة', className: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 },
  pending: { label: 'قيد الإرسال', className: 'bg-info/10 text-info border-info/30', icon: Clock },
  failed: { label: 'فشلت', className: 'bg-warning/10 text-warning border-warning/30', icon: AlertTriangle },
  dlq: { label: 'فشل نهائي (DLQ)', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertOctagon },
  suppressed: { label: 'محجوبة', className: 'bg-muted text-muted-foreground border-border', icon: ShieldOff },
  bounced: { label: 'مرتدّة', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
  complained: { label: 'شكوى', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border', icon: Mail };
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', cfg.className)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Mail; label: string; value: number | string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'medium' });
  } catch { return iso; }
}

export default function EmailMonitorPage() {
  const h = useEmailMonitorPage();

  const lastRunLabel = h.adminStats?.last_log_at ? formatDateTime(h.adminStats.last_log_at) : 'لا يوجد';
  const rateLimitedUntil = h.adminStats?.rate_limited_until;
  const isRateLimited = rateLimitedUntil && new Date(rateLimitedUntil) > new Date();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              مراقبة نظام البريد الإلكتروني
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              حالة الطابور وإحصاءات الإرسال وإدارة الرسائل الفاشلة
            </p>
          </div>
          <Button variant="outline" onClick={h.refresh} disabled={h.isLoading}>
            <RefreshCw className={cn('w-4 h-4', h.isLoading && 'animate-spin')} />
            تحديث
          </Button>
        </div>

        {/* تحذير rate limit */}
        {isRateLimited && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <div className="text-sm">
                <p className="font-medium">الطابور متوقف مؤقتاً (Rate limit)</p>
                <p className="text-muted-foreground">سيستأنف الإرسال في: {formatDateTime(rateLimitedUntil)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Clock} label="آخر تشغيل" value={lastRunLabel} color="bg-info/10 text-info" />
          <StatCard icon={Inbox} label="رسائل DLQ — مصادقة" value={h.adminStats?.auth_dlq_count ?? 0} color="bg-destructive/10 text-destructive" />
          <StatCard icon={Inbox} label="رسائل DLQ — تشغيلي" value={h.adminStats?.transactional_dlq_count ?? 0} color="bg-destructive/10 text-destructive" />
          <StatCard icon={Mail} label="إجمالي (للفترة المختارة)" value={h.stats.total} color="bg-primary/10 text-primary" />
        </div>

        {/* DLQ Retry */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              إعادة محاولة الرسائل الفاشلة (DLQ)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant="destructive"
              onClick={() => h.retry('auth_emails')}
              disabled={h.isRetrying || (h.adminStats?.auth_dlq_count ?? 0) === 0}
            >
              <RotateCcw className={cn('w-4 h-4', h.isRetrying && 'animate-spin')} />
              إعادة محاولة بريد المصادقة ({h.adminStats?.auth_dlq_count ?? 0})
            </Button>
            <Button
              variant="destructive"
              onClick={() => h.retry('transactional_emails')}
              disabled={h.isRetrying || (h.adminStats?.transactional_dlq_count ?? 0) === 0}
            >
              <RotateCcw className={cn('w-4 h-4', h.isRetrying && 'animate-spin')} />
              إعادة محاولة البريد التشغيلي ({h.adminStats?.transactional_dlq_count ?? 0})
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              يقرأ حتى 50 رسالة من DLQ ويعيدها إلى الطابور الأصلي.
            </p>
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={CheckCircle2} label="مُرسلة" value={h.stats.sent} color="bg-success/10 text-success" />
          <StatCard icon={Clock} label="قيد الإرسال" value={h.stats.pending} color="bg-info/10 text-info" />
          <StatCard icon={AlertTriangle} label="فشلت" value={h.stats.failed} color="bg-warning/10 text-warning" />
          <StatCard icon={AlertOctagon} label="فشل نهائي (DLQ)" value={h.stats.dlq} color="bg-destructive/10 text-destructive" />
          <StatCard icon={ShieldOff} label="محجوبة" value={h.stats.suppressed} color="bg-muted text-muted-foreground" />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الفلاتر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Range */}
            <div className="flex flex-wrap gap-2">
              {(['24h', '7d', '30d'] as EmailRange[]).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={h.range === r ? 'default' : 'outline'}
                  onClick={() => { h.setRange(r); h.setShowCustom(false); }}
                >
                  {r === '24h' ? 'آخر 24 ساعة' : r === '7d' ? 'آخر 7 أيام' : 'آخر 30 يوم'}
                </Button>
              ))}
              <Button
                size="sm"
                variant={h.range === 'custom' ? 'default' : 'outline'}
                onClick={() => { h.setRange('custom'); h.setShowCustom(true); }}
              >
                نطاق مخصص
              </Button>
            </div>

            {h.showCustom && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">من</label>
                  <Input
                    type="datetime-local"
                    value={h.customStart}
                    onChange={(e) => h.setCustomStart(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">إلى</label>
                  <Input
                    type="datetime-local"
                    value={h.customEnd}
                    onChange={(e) => h.setCustomEnd(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  />
                </div>
              </div>
            )}

            {/* Template + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">نوع القالب</label>
                <Select value={h.templateFilter} onValueChange={h.setTemplateFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع القوالب</SelectItem>
                    {h.templates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الحالة</label>
                <Select value={h.statusFilter} onValueChange={(v) => h.setStatusFilter(v as EmailStatusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="sent">مُرسلة</SelectItem>
                    <SelectItem value="pending">قيد الإرسال</SelectItem>
                    <SelectItem value="failed">فشلت</SelectItem>
                    <SelectItem value="dlq">فشل نهائي (DLQ)</SelectItem>
                    <SelectItem value="suppressed">محجوبة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">سجل الرسائل ({h.totalCount})</CardTitle>
            {h.totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <Button size="sm" variant="outline" onClick={() => h.setPage(Math.max(0, h.page - 1))} disabled={h.page === 0}>
                  السابق
                </Button>
                <span className="text-muted-foreground">صفحة {h.page + 1} من {h.totalPages}</span>
                <Button size="sm" variant="outline" onClick={() => h.setPage(Math.min(h.totalPages - 1, h.page + 1))} disabled={h.page >= h.totalPages - 1}>
                  التالي
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>القالب</TableHead>
                    <TableHead>المستلم</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التوقيت</TableHead>
                    <TableHead>الخطأ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {h.isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                  ) : h.logs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد رسائل في هذه الفترة</TableCell></TableRow>
                  ) : (
                    h.logs.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.template_name}</TableCell>
                        <TableCell className="text-sm">{row.recipient_email}</TableCell>
                        <TableCell><StatusBadge status={row.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                        <TableCell className="text-xs text-destructive max-w-xs truncate" title={row.error_message ?? ''}>
                          {row.error_message ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
