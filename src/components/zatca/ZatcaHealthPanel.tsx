/**
 * بطاقة صحة ZATCA — أيام انتهاء الشهادة + حالة سلسلة ICV
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Link2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNowClock } from '@/lib/hooks/useNowClock';
import type { ZatcaCertificateSafe } from '@/hooks/data/zatca/useZatcaCertificates';

interface ChainRecord {
  id: string;
  invoice_id: string;
  icv: number;
  invoice_hash: string;
  previous_hash: string;
  source_table: string;
  created_at: string | null;
}

interface ZatcaHealthPanelProps {
  activeCert: ZatcaCertificateSafe | undefined;
  chain: ChainRecord[];
  pendingInvoices: number;
}

export default function ZatcaHealthPanel({ activeCert, chain, pendingInvoices }: ZatcaHealthPanelProps) {
  const now = useNowClock(60_000);
  const certHealth = useMemo(() => {
    if (!activeCert?.expires_at) {
      return { daysLeft: null as number | null, tone: 'muted' as const, label: 'غير متوفر' };
    }
    const ms = new Date(activeCert.expires_at).getTime() - now;
    const days = Math.ceil(ms / 86_400_000);
    if (days < 0) return { daysLeft: days, tone: 'destructive' as const, label: 'منتهية' };
    if (days <= 14) return { daysLeft: days, tone: 'destructive' as const, label: 'حرج' };
    if (days <= 30) return { daysLeft: days, tone: 'warning' as const, label: 'يُستحسن التجديد' };
    return { daysLeft: days, tone: 'success' as const, label: 'سليمة' };
  }, [activeCert?.expires_at, now]);

  const chainHealth = useMemo(() => {
    const last = chain?.[0];
    if (!last) {
      return { lastIcv: 0, lastHash: null as string | null, count: 0 };
    }
    // chain مرتب تنازلياً حسب icv
    return {
      lastIcv: last.icv,
      lastHash: last.invoice_hash,
      count: chain.length,
    };
  }, [chain]);

  const hashShort = chainHealth.lastHash ? `${chainHealth.lastHash.slice(0, 8)}…${chainHealth.lastHash.slice(-6)}` : '—';

  const toneClass: Record<string, string> = {
    success: 'border-success/40 bg-success/5',
    warning: 'border-warning/40 bg-warning/5',
    destructive: 'border-destructive/40 bg-destructive/5',
    muted: 'border-border bg-muted/20',
  };
  const textTone: Record<string, string> = {
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    muted: 'text-muted-foreground',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* بطاقة حالة الشهادة */}
      <Card className={toneClass[certHealth.tone]}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className={`w-4 h-4 ${textTone[certHealth.tone]}`} />
            صلاحية الشهادة النشطة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {certHealth.daysLeft === null ? (
            <p className="text-sm text-muted-foreground">لا توجد شهادة نشطة. سجّل من تبويب "الشهادات".</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${textTone[certHealth.tone]}`}>
                  {certHealth.daysLeft < 0 ? `${Math.abs(certHealth.daysLeft)}` : certHealth.daysLeft}
                </span>
                <span className="text-sm text-muted-foreground">
                  {certHealth.daysLeft < 0 ? 'يوم منذ الانتهاء' : 'يوم متبقٍ'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={textTone[certHealth.tone]}>
                  {certHealth.tone === 'success' ? <CheckCircle2 className="w-3 h-3 ml-1" /> : <AlertTriangle className="w-3 h-3 ml-1" />}
                  {certHealth.label}
                </Badge>
                {activeCert?.expires_at && (
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {new Date(activeCert.expires_at).toLocaleDateString('ar-SA')}
                  </span>
                )}
              </div>
              {certHealth.tone === 'destructive' && (
                <p className="text-xs text-destructive">سيتم إيقاف التبليغ تلقائياً. يجب التجديد فوراً.</p>
              )}
              {certHealth.tone === 'warning' && (
                <p className="text-xs text-warning">يُنصح بالتجديد قبل اقتراب الانتهاء.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* بطاقة سلسلة التوقيع */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            سلسلة التوقيع (ICV Chain)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{chainHealth.lastIcv}</span>
            <span className="text-sm text-muted-foreground">آخر ICV</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">إجمالي السجلات:</span>
            <span className="font-semibold">{chainHealth.count}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">آخر hash:</span>
            <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded" dir="ltr">{hashShort}</code>
          </div>
          {pendingInvoices > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-warning">
                <AlertTriangle className="w-3 h-3 ml-1" />
                {pendingInvoices} فاتورة معلَّقة
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
