/**
 * RuntimeErrorsPanel — عرض أخطاء العميل الحيّة من access_log مع فلترة وبحث
 */
import { useMemo, useState } from 'react';
import { useClientErrors } from '@/hooks/data/audit/useClientErrors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { fmtDateTime } from '@/utils/format/format';

function classify(msg: string): string {
  if (/chunk|loading css|dynamic import/i.test(msg)) return 'Chunk';
  if (/network|fetch|failed to fetch/i.test(msg)) return 'Network';
  if (/42501|row-level security|permission/i.test(msg)) return 'RLS';
  if (/auth|jwt|refresh_token/i.test(msg)) return 'Auth';
  if (/supabase|postgrest/i.test(msg)) return 'Supabase';
  return 'JavaScript';
}

export default function RuntimeErrorsPanel() {
  const { data = [], isLoading, refetch, isFetching } = useClientErrors();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const filtered = q.trim()
      ? data.filter((e) => {
          const m = (e.metadata?.message as string) ?? '';
          return m.toLowerCase().includes(q.toLowerCase()) || (e.target_path ?? '').toLowerCase().includes(q.toLowerCase());
        })
      : data;

    // تجميع حسب رسالة الخطأ
    const grouped = new Map<string, { count: number; last: string; sample: (typeof data)[number]; type: string }>();
    for (const e of filtered) {
      const msg = (e.metadata?.message as string) ?? 'خطأ غير محدد';
      const key = msg.substring(0, 200);
      const g = grouped.get(key);
      if (g) {
        g.count++;
        if (e.created_at > g.last) g.last = e.created_at;
      } else {
        grouped.set(key, { count: 1, last: e.created_at, sample: e, type: classify(msg) });
      }
    }
    return Array.from(grouped.entries())
      .map(([msg, v]) => ({ msg, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [data, q]);

  const copyStack = (metadata: Record<string, unknown> | null) => {
    const stack = (metadata?.stack as string) ?? (metadata?.message as string) ?? '';
    void navigator.clipboard.writeText(stack);
    toast.success('تم نسخ Stack');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          الأخطاء الحيّة ({data.length})
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="ابحث في الرسالة أو المسار..." value={q} onChange={(e) => setQ(e.target.value)} />

        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
        ) : rows.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">لا توجد أخطاء مسجّلة — ممتاز! 🎉</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-auto">
            {rows.map((r) => (
              <div key={r.msg} className="border rounded-lg p-3 hover:bg-muted/30 transition">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Badge variant="destructive">{r.count}×</Badge>
                    <Badge variant="outline">{r.type}</Badge>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtDateTime(r.last)}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyStack(r.sample.metadata)} title="نسخ Stack">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-sm font-mono break-words">{r.msg}</p>
                {r.sample.target_path && (
                  <p className="text-xs text-muted-foreground mt-1">📍 {r.sample.target_path}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
