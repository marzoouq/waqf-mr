/**
 * EmailMonitorPage — لوحة مراقبة نظام البريد الإلكتروني.
 *
 * صلاحية الوصول: ADMIN_ONLY (مسجّلة في src/routes/adminRoutes.tsx).
 * سبب التقييد على الناظر (admin) حصراً — لا accountant ولا غيره:
 *   1. تعرض `recipient_email` لكل المستلمين (PII — قائمة بريد كاملة).
 *   2. تعرض `error_message` و metadata تشخيصية قد تكشف بنية النظام
 *      ومعلومات حساسة عن أعطال SMTP / المزود.
 *   3. تتيح أزرار retry / DLQ التي تؤثر فعلياً على إعادة إرسال البريد
 *      للمستلمين النهائيين، وهي عملية يجب أن تبقى بيد الناظر فقط.
 *
 * مكون حاوية رفيع: يمرّر بيانات الـ page hook إلى مكونات عرضية مفصولة.
 */
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  RefreshCw, Mail, CheckCircle2, AlertTriangle, ShieldOff,
  Clock, AlertOctagon, Inbox,
} from 'lucide-react';
import { useEmailMonitorPage } from '@/hooks/page/admin/management/useEmailMonitorPage';
import { cn } from '@/lib/cn';
import { EmailStatCard } from '@/components/email-monitor/EmailMonitorPrimitives';
import { formatEmailDateTime } from '@/components/email-monitor/emailMonitorUtils';
import { EmailDlqRetryCard } from '@/components/email-monitor/EmailDlqRetryCard';
import { EmailFiltersCard } from '@/components/email-monitor/EmailFiltersCard';
import { EmailLogsTable } from '@/components/email-monitor/EmailLogsTable';

export default function EmailMonitorPage() {
  const h = useEmailMonitorPage();

  const lastRunLabel = h.adminStats?.last_log_at ? formatEmailDateTime(h.adminStats.last_log_at) : 'لا يوجد';
  const rateLimitedUntil = h.adminStats?.rate_limited_until;
  const isRateLimited = rateLimitedUntil && new Date(rateLimitedUntil) > new Date();

  return (
    <DashboardLayout>
      <div className="space-y-6">
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

        {isRateLimited && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <div className="text-sm">
                <p className="font-medium">الطابور متوقف مؤقتاً (Rate limit)</p>
                <p className="text-muted-foreground">سيستأنف الإرسال في: {formatEmailDateTime(rateLimitedUntil)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <EmailStatCard icon={Clock} label="آخر تشغيل" value={lastRunLabel} color="bg-info/10 text-info" />
          <EmailStatCard icon={Inbox} label="رسائل DLQ — مصادقة" value={h.adminStats?.auth_dlq_count ?? 0} color="bg-destructive/10 text-destructive" />
          <EmailStatCard icon={Inbox} label="رسائل DLQ — تشغيلي" value={h.adminStats?.transactional_dlq_count ?? 0} color="bg-destructive/10 text-destructive" />
          <EmailStatCard icon={Mail} label="إجمالي (للفترة المختارة)" value={h.stats.total} color="bg-primary/10 text-primary" />
        </div>

        <EmailDlqRetryCard
          authDlqCount={h.adminStats?.auth_dlq_count ?? 0}
          transactionalDlqCount={h.adminStats?.transactional_dlq_count ?? 0}
          retryingQueue={h.retryingQueue}
          onRetry={h.retry}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <EmailStatCard icon={CheckCircle2} label="مُرسلة" value={h.stats.sent} color="bg-success/10 text-success" />
          <EmailStatCard icon={Clock} label="قيد الإرسال" value={h.stats.pending} color="bg-info/10 text-info" />
          <EmailStatCard icon={AlertTriangle} label="فشلت" value={h.stats.failed} color="bg-warning/10 text-warning" />
          <EmailStatCard icon={AlertOctagon} label="فشل نهائي (DLQ)" value={h.stats.dlq} color="bg-destructive/10 text-destructive" />
          <EmailStatCard icon={ShieldOff} label="محجوبة" value={h.stats.suppressed} color="bg-muted text-muted-foreground" />
        </div>

        <EmailFiltersCard
          range={h.range}
          setRange={h.setRange}
          showCustom={h.showCustom}
          setShowCustom={h.setShowCustom}
          customStart={h.customStart}
          setCustomStart={h.setCustomStart}
          customEnd={h.customEnd}
          setCustomEnd={h.setCustomEnd}
          templates={h.templates}
          templateFilter={h.templateFilter}
          setTemplateFilter={h.setTemplateFilter}
          statusFilter={h.statusFilter}
          setStatusFilter={h.setStatusFilter}
        />

        <EmailLogsTable
          logs={h.logs}
          isLoading={h.isLoading}
          totalCount={h.totalCount}
          page={h.page}
          totalPages={h.totalPages}
          setPage={h.setPage}
        />
      </div>
    </DashboardLayout>
  );
}
