/**
 * AlertsPanel — حوادث التنبيه وقواعدها (الناظر والدعم الفني)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, BellRing, RefreshCw, Download, CheckCheck, Check } from 'lucide-react';
import { toast } from 'sonner';
import { fmtDateTime } from '@/utils/format/format';
import { downloadJsonData } from '@/lib/diagnostics/downloadJsonData';
import { logger } from '@/lib/logger';
import { useAlertIncidents, useAlertRules, type AlertSeverity, type AlertStatus } from '@/hooks/data/diagnostics/useAlertIncidents';

const SEVERITY_LABEL: Record<AlertSeverity, string> = { info: 'معلومة', warning: 'تحذير', critical: 'حرج' };
const STATUS_LABEL: Record<AlertStatus, string> = { open: 'مفتوح', acknowledged: 'تم الإقرار', resolved: 'محلول' };

const severityVariant = (s: AlertSeverity) => (s === 'critical' ? 'destructive' : s === 'warning' ? 'secondary' : 'outline');

export default function AlertsPanel() {
  const { data: incidents, isFetching, refetch, setStatus } = useAlertIncidents();
  const { data: rules, updateRule } = useAlertRules();

  const rows = incidents ?? [];
  const openCount = rows.filter((r) => r.status === 'open').length;

  const handleStatus = async (id: string, status: 'acknowledged' | 'resolved') => {
    try {
      await setStatus.mutateAsync({ id, status });
      toast.success(status === 'acknowledged' ? 'تم الإقرار بالحادثة' : 'تم إغلاق الحادثة');
    } catch (e) {
      logger.error('[alerts] فشل تحديث الحالة:', e);
      toast.error('فشل تحديث الحالة — تأكد من صلاحياتك');
    }
  };

  const handleRuleToggle = async (id: string, patch: { is_active?: boolean; notify_email?: boolean }) => {
    try {
      await updateRule.mutateAsync({ id, patch });
      toast.success('تم تحديث قاعدة التنبيه');
    } catch (e) {
      logger.error('[alerts] فشل تحديث القاعدة:', e);
      toast.error('فشل تحديث القاعدة');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            {openCount > 0 ? <BellRing className="h-4 w-4 text-destructive" /> : <Bell className="h-4 w-4" />}
            حوادث التنبيه — مفتوحة: {openCount} / إجمالي: {rows.length}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { downloadJsonData(rows, 'alert-incidents'); toast.success('تم التصدير'); }}>
              <Download className="h-4 w-4 ml-1" /> تصدير
            </Button>
            <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ml-1 ${isFetching ? 'animate-spin' : ''}`} /> تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد حوادث تنبيه — النظام سليم.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الشدة</TableHead>
                    <TableHead>التنبيه</TableHead>
                    <TableHead>التكرار</TableHead>
                    <TableHead>المسار</TableHead>
                    <TableHead>آخر ظهور</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant={severityVariant(r.severity)}>{SEVERITY_LABEL[r.severity]}</Badge></TableCell>
                      <TableCell className="max-w-[22rem]">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{r.summary}</div>
                      </TableCell>
                      <TableCell className="font-mono">{r.occurrences}</TableCell>
                      <TableCell className="text-xs font-mono">{r.target_path ?? '—'}</TableCell>
                      <TableCell className="text-xs">{fmtDateTime(r.last_seen_at)}</TableCell>
                      <TableCell><Badge variant={r.status === 'resolved' ? 'outline' : 'secondary'}>{STATUS_LABEL[r.status]}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {r.status === 'open' && (
                            <Button size="sm" variant="ghost" onClick={() => void handleStatus(r.id, 'acknowledged')}>
                              <Check className="h-4 w-4 ml-1" /> إقرار
                            </Button>
                          )}
                          {r.status !== 'resolved' && (
                            <Button size="sm" variant="ghost" onClick={() => void handleStatus(r.id, 'resolved')}>
                              <CheckCheck className="h-4 w-4 ml-1" /> إغلاق
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">قواعد التنبيه</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>القاعدة</TableHead>
                  <TableHead>الشدة</TableHead>
                  <TableHead>الحد / النافذة</TableHead>
                  <TableHead>التهدئة</TableHead>
                  <TableHead>بريد</TableHead>
                  <TableHead>مُفعّلة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules ?? []).map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{rule.code}</div>
                    </TableCell>
                    <TableCell><Badge variant={severityVariant(rule.severity)}>{SEVERITY_LABEL[rule.severity]}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{rule.threshold_count} / {rule.window_minutes}د</TableCell>
                    <TableCell className="text-xs font-mono">{rule.cooldown_minutes}د</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.notify_email}
                        onCheckedChange={(v) => void handleRuleToggle(rule.id, { notify_email: v })}
                        aria-label={`إشعار بريد لقاعدة ${rule.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(v) => void handleRuleToggle(rule.id, { is_active: v })}
                        aria-label={`تفعيل قاعدة ${rule.name}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
