/**
 * لوحة العناوين المحجوبة — عرض، حجب يدوي، وفتح الحجب (الناظر فقط للتعديل).
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, ShieldOff, ShieldCheck, Download } from 'lucide-react';
import { toast } from 'sonner';
import { fmtDateTime } from '@/utils/format/format';
import { downloadJsonData } from '@/lib/diagnostics/downloadJsonData';
import { useBlockedIps } from '@/hooks/data/audit/useBlockedIps';
import { logger } from '@/lib/logger';

export default function BlockedIpsPanel() {
  const { data, isFetching, refetch, blockIp, unblockIp } = useBlockedIps();
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');

  const rows = data ?? [];
  const activeCount = rows.filter((r) => r.is_active).length;

  const handleBlock = async () => {
    if (!ip.trim()) {
      toast.error('أدخل عنوان IP');
      return;
    }
    try {
      await blockIp.mutateAsync({ ip: ip.trim(), reason: reason.trim() || undefined, hours: null });
      toast.success(`تم حجب العنوان ${ip.trim()}`);
      setIp('');
      setReason('');
    } catch (e) {
      logger.error('[blockedIps] فشل الحجب:', e);
      toast.error('فشل الحجب — تأكد من صلاحياتك');
    }
  };

  const handleUnblock = async (value: string) => {
    try {
      await unblockIp.mutateAsync(value);
      toast.success(`تم فتح العنوان ${value}`);
    } catch (e) {
      logger.error('[blockedIps] فشل الفتح:', e);
      toast.error('فشل فتح الحجب');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldOff className="h-4 w-4" /> العناوين المحجوبة — نشِط: {activeCount} / إجمالي: {rows.length}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { downloadJsonData(rows, 'blocked-ips'); toast.success('تم التصدير'); }}>
              <Download className="h-4 w-4 ml-1" /> تصدير
            </Button>
            <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ml-1 ${isFetching ? 'animate-spin' : ''}`} /> تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-muted/40">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="block-ip">عنوان IP</label>
              <Input id="block-ip" className="h-9 w-44 font-mono" placeholder="203.0.113.10" value={ip} onChange={(e) => setIp(e.target.value)} />
            </div>
            <div className="space-y-1 flex-1 min-w-48">
              <label className="text-xs text-muted-foreground" htmlFor="block-reason">السبب (اختياري)</label>
              <Input id="block-reason" className="h-9" placeholder="سلوك مريب" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => void handleBlock()} disabled={blockIp.isPending}>
              <ShieldOff className="h-4 w-4 ml-1" /> حجب يدوي
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العنوان</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>السبب</TableHead>
                  <TableHead>الحوادث</TableHead>
                  <TableHead>أحداث 7 أيام</TableHead>
                  <TableHead>حسابات</TableHead>
                  <TableHead>ينتهي</TableHead>
                  <TableHead>آخر تحديث</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.ip_address}</TableCell>
                    <TableCell>
                      {r.is_active
                        ? <Badge variant="destructive">محجوب</Badge>
                        : <Badge variant="secondary">مفتوح</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{r.auto_blocked ? 'تلقائي' : 'يدوي'}</TableCell>
                    <TableCell className="text-xs max-w-64">{r.reason}</TableCell>
                    <TableCell>{r.incident_count}</TableCell>
                    <TableCell>{r.recent_events}</TableCell>
                    <TableCell>{r.distinct_emails}</TableCell>
                    <TableCell className="text-xs">{r.expires_at ? fmtDateTime(r.expires_at) : 'دائم'}</TableCell>
                    <TableCell className="text-xs">{fmtDateTime(r.updated_at)}</TableCell>
                    <TableCell>
                      {r.is_active ? (
                        <Button size="sm" variant="outline" onClick={() => void handleUnblock(r.ip_address)} disabled={unblockIp.isPending}>
                          <ShieldCheck className="h-4 w-4 ml-1" /> فتح
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => void blockIp.mutateAsync({ ip: r.ip_address }).then(() => toast.success('تم الحجب مجدداً')).catch(() => toast.error('فشل الحجب'))}>
                          إعادة الحجب
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">لا توجد عناوين محجوبة — النظام سليم</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            الحجب التلقائي: 5 محاولات دخول فاشلة خلال 10 دقائق، أو 3 محاولات وصول غير مصرّح، أو 20 خطأ خلال 5 دقائق.
            الحجب التلقائي ينتهي تلقائياً بعد 24 ساعة، والناظر والدعم الفني مستثنون.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
