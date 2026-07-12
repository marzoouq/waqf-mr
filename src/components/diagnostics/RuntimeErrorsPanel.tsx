/**
 * RuntimeErrorsPanel — عرض أخطاء العميل الحيّة من access_log مع فلترة وبحث.
 * يقرأ رسالة الخطأ من error_message → message → error_name، ويستبعد ضجيج الاختبار افتراضياً.
 */
import { useMemo, useState } from 'react';
import { useClientErrors, type ClientError } from '@/hooks/data/audit/useClientErrors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { fmtDateTime } from '@/utils/format/format';

function readMsg(m: Record<string, unknown> | null): string {
  if (!m) return '(بدون رسالة)';
  return (
    (m.error_message as string) ||
    (m.message as string) ||
    (m.error_name as string) ||
    '(بدون رسالة)'
  );
}

function readStack(m: Record<string, unknown> | null): string {
  if (!m) return '';
  return (
    (m.error_stack as string) ||
    (m.stack as string) ||
    (m.component_stack as string) ||
    readMsg(m)
  );
}

function classify(msg: string, name?: string): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('chunk') || /chunk|loading css|dynamic import/i.test(msg)) return 'Chunk';
  if (n.includes('network') || n === 'aborterror' || /network|fetch|failed to fetch/i.test(msg)) return 'Network';
  if (/42501|row-level security|permission/i.test(msg)) return 'RLS';
  if (n === 'typeerror' || /cannot read|undefined|null/i.test(msg)) return 'TypeError';
  if (n === 'referenceerror' || /is not defined|before initialization/i.test(msg)) return 'ReferenceError';
  if (/auth|jwt|refresh_token/i.test(msg)) return 'Auth';
  if (/supabase|postgrest/i.test(msg)) return 'Supabase';
  return 'JavaScript';
}

interface Group {
  msg: string;
  count: number;
  first: string;
  last: string;
  sample: ClientError;
  type: string;
}

export default function RuntimeErrorsPanel() {
  const [includeNoise, setIncludeNoise] = useState(false);
  const { data, isLoading, refetch, isFetching } = useClientErrors(includeNoise);
  const [q, setQ] = useState('');

  const rows: Group[] = useMemo(() => {
    const source = data?.rows ?? [];
    const filtered = q.trim()
      ? source.filter((e) => {
          const m = readMsg(e.metadata).toLowerCase();
          const term = q.toLowerCase();
          return m.includes(term) || (e.target_path ?? '').toLowerCase().includes(term);
        })
      : source;

    const grouped = new Map<string, Group>();
    for (const e of filtered) {
      const msg = readMsg(e.metadata);
      const key = msg.substring(0, 200);
      const name = (e.metadata?.error_name as string) ?? '';
      const g = grouped.get(key);
      if (g) {
        g.count++;
        if (e.created_at > g.last) g.last = e.created_at;
        if (e.created_at < g.first) g.first = e.created_at;
      } else {
        grouped.set(key, {
          msg: key,
          count: 1,
          first: e.created_at,
          last: e.created_at,
          sample: e,
          type: classify(msg, name),
        });
      }
    }
    return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
  }, [data?.rows, q]);

  const copyStack = (metadata: Record<string, unknown> | null) => {
    void navigator.clipboard.writeText(readStack(metadata));
    toast.success('تم نسخ Stack');
  };

  const total = data?.totalCount ?? 0;
  const noise = data?.testNoiseCount ?? 0;
  const last24h = data?.last24hCount ?? 0;
  const shown = data?.displayedCount ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          الأخطاء الحيّة
          <Badge variant="outline">إجمالي {total}</Badge>
          <Badge variant={last24h > 0 ? 'destructive' : 'secondary'}>آخر 24س: {last24h}</Badge>
          <Badge variant="secondary">معروض: {shown}</Badge>
          {noise > 0 && !includeNoise && (
            <Badge variant="outline" title="سجلات اختبار مُخفية">ضجيج مُخفي: {noise}</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="include-noise" checked={includeNoise} onCheckedChange={setIncludeNoise} />
            <Label htmlFor="include-noise" className="text-xs">تضمين ضجيج الاختبار</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
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
                    <span className="text-xs text-muted-foreground shrink-0">
                      آخر: {fmtDateTime(r.last)}
                    </span>
                    {r.count > 1 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        • أول: {fmtDateTime(r.first)}
                      </span>
                    )}
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
