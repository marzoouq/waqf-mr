/**
 * جدول سجل Backend — يعرض meta لفحوصات backend مع فلتر ونسخ JSON.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import StatusFilterChips, { type StatusFilter } from './StatusFilterChips';
import type { CheckResult, CheckStatus } from '@/lib/diagnostics/types';
import type { CategoryResults } from '@/lib/diagnostics/exporters';

interface Props { results: CategoryResults[] }

const STATUS_CLS: Record<CheckStatus, string> = {
  pass: 'text-success',
  warn: 'text-warning',
  fail: 'text-destructive',
  info: 'text-info',
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: 'ناجح', warn: 'تحذير', fail: 'فشل', info: 'معلومة',
};

function extractBackendRows(results: CategoryResults[]): CheckResult[] {
  const cat = results.find(c => c.category === 'Backend & Edge');
  return cat?.results.filter(r => r.meta) ?? [];
}

export default function BackendLogTable({ results }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const rows = useMemo(() => extractBackendRows(results), [results]);

  const counts = useMemo(() => {
    const c: Record<CheckStatus, number> = { pass: 0, warn: 0, fail: 0, info: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter);
    return [...filtered].sort((a, b) => (b.meta?.ms ?? 0) - (a.meta?.ms ?? 0));
  }, [rows, filter]);

  const copy = async (r: CheckResult) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(r, null, 2));
      toast.success('تم نسخ السطر كـ JSON');
    } catch {
      toast.error('تعذّر النسخ');
    }
  };

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          لا يوجد سجل backend — شغّل الفحوصات لعرض البيانات.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <StatusFilterChips value={filter} onChange={setFilter} counts={counts} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right border-b border-border">
                <th className="py-2 px-2 font-semibold">الدالة</th>
                <th className="py-2 px-2 font-semibold">البيئة</th>
                <th className="py-2 px-2 font-semibold">HTTP</th>
                <th className="py-2 px-2 font-semibold">الزمن (ms)</th>
                <th className="py-2 px-2 font-semibold">الحالة</th>
                <th className="py-2 px-2 font-semibold">التفاصيل</th>
                <th className="py-2 px-2 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2 px-2 font-mono text-xs">{r.meta?.fnName ?? r.label}</td>
                  <td className="py-2 px-2"><Badge variant="outline" className="text-xs">{r.meta?.env ?? '—'}</Badge></td>
                  <td className="py-2 px-2 font-mono text-xs">{r.meta?.httpStatus ?? '—'}</td>
                  <td className="py-2 px-2 font-mono text-xs">{r.meta?.ms ?? '—'}</td>
                  <td className="py-2 px-2"><span className={STATUS_CLS[r.status]}>{STATUS_LABEL[r.status]}</span></td>
                  <td className="py-2 px-2 text-xs text-muted-foreground break-all">{r.detail}</td>
                  <td className="py-2 px-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(r)} aria-label="نسخ JSON">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
