/**
 * SecurityIntrusionPanel — لوحة كشف محاولات الاختراق والانتهاكات الأمنية
 */
import { useState } from 'react';
import { useIntrusionSummary } from '@/hooks/data/diagnostics/useIntrusionSummary';
import { useRecentRoleChanges } from '@/hooks/data/diagnostics/useRecentRoleChanges';
import { computeThreatScore } from '@/lib/diagnostics/threatScore';
import ThreatLevelIndicator from './ThreatLevelIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, KeyRound, Ban, Users, RefreshCw } from 'lucide-react';
import { fmtDateTime } from '@/utils/format/format';

export default function SecurityIntrusionPanel() {
  const [hours, setHours] = useState('24');
  const h = parseInt(hours, 10);
  const { data: summary, isLoading, refetch, isFetching } = useIntrusionSummary(h);
  const { data: roleChanges = [] } = useRecentRoleChanges(168);

  const threat = computeThreatScore(summary);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Select value={hours} onValueChange={setHours} dir="rtl">
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">آخر ساعة</SelectItem>
            <SelectItem value="24">آخر 24 ساعة</SelectItem>
            <SelectItem value="168">آخر أسبوع</SelectItem>
            <SelectItem value="720">آخر 30 يوم</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ThreatLevelIndicator assessment={threat} />

      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={KeyRound} label="محاولات دخول فاشلة" value={summary?.failed_logins ?? 0} tone={summary && summary.failed_logins > 5 ? 'danger' : 'ok'} />
          <StatCard icon={Ban} label="انتهاكات RLS" value={summary?.rls_violations ?? 0} tone={summary && summary.rls_violations > 0 ? 'danger' : 'ok'} />
          <StatCard icon={ShieldAlert} label="وصول غير مصرح" value={summary?.unauthorized_access ?? 0} tone={summary && summary.unauthorized_access > 0 ? 'warn' : 'ok'} />
          <StatCard icon={Users} label="تغييرات أدوار" value={summary?.role_changes ?? 0} tone={summary && summary.role_changes > 0 ? 'warn' : 'ok'} />
        </div>
      )}

      {summary && summary.top_failed_emails.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">أكثر الحسابات المستهدفة</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {summary.top_failed_emails.map((e) => (
                <li key={e.email} className="flex justify-between items-center py-1.5 border-b last:border-0">
                  <span className="font-mono text-sm">{e.email}</span>
                  <Badge variant="destructive">{e.cnt} محاولة</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {summary && summary.top_error_paths.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">أكثر المسارات إثارة للأخطاء</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {summary.top_error_paths.map((p) => (
                <li key={p.path} className="flex justify-between items-center py-1.5 border-b last:border-0">
                  <span className="font-mono text-sm truncate">{p.path}</span>
                  <Badge variant="outline">{p.cnt}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {roleChanges.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">تغييرات الأدوار (آخر أسبوع)</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 max-h-64 overflow-auto">
              {roleChanges.slice(0, 20).map((c) => (
                <li key={c.id} className="text-xs border-b py-1.5 last:border-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={c.operation === 'DELETE' ? 'destructive' : 'default'}>{c.operation}</Badge>
                    <span className="text-muted-foreground">{fmtDateTime(c.created_at)}</span>
                  </div>
                  <pre className="mt-1 text-[10px] font-mono text-muted-foreground overflow-x-auto">
                    {JSON.stringify(c.new_data ?? c.old_data ?? {}, null, 0)}
                  </pre>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: 'ok' | 'warn' | 'danger' }) {
  const color = tone === 'danger' ? 'text-destructive' : tone === 'warn' ? 'text-amber-500' : 'text-muted-foreground';
  return (
    <Card>
      <CardContent className="py-4 text-center space-y-1">
        <Icon className={`w-6 h-6 mx-auto ${color}`} />
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
