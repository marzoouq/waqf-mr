/**
 * شبكة بطاقات فحوصات التشخيص — استُخرجت من SystemDiagnosticsPage للحد من حجمه.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { sanitizeDiagnosticOutput } from '@/lib/diagnostics/sanitize';
import type { CheckResult, CheckStatus } from '@/lib/diagnostics/types';
import type { DiagnosticCategoryRun } from '@/hooks/page/admin/management/useSystemDiagnostics';
import StatusFilterChips, { type StatusFilter } from './StatusFilterChips';

const STATUS_CONFIG: Record<CheckStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pass: { icon: CheckCircle2, color: 'text-success', label: 'ناجح' },
  warn: { icon: AlertTriangle, color: 'text-warning', label: 'تحذير' },
  fail: { icon: XCircle, color: 'text-destructive', label: 'فشل' },
  info: { icon: Info, color: 'text-info', label: 'معلومة' },
};

function CheckRow({ result }: { result: CheckResult }) {
  const cfg = STATUS_CONFIG[result.status];
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.color}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{result.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 break-all">{sanitizeDiagnosticOutput(result.detail)}</p>
      </div>
      <Badge variant="outline" className={`shrink-0 text-xs ${cfg.color}`}>{cfg.label}</Badge>
    </div>
  );
}

interface Props {
  allCategories: DiagnosticCategoryRun[];
  filter: StatusFilter;
  setFilter: (v: StatusFilter) => void;
  filterCounts: Record<CheckStatus, number>;
  hasResults: boolean;
  running: boolean;
  runningCategory: string | null;
  onRunSingle: (title: string) => void;
}

export default function DiagnosticsChecksGrid(p: Props) {
  return (
    <>
      {p.hasResults && <StatusFilterChips value={p.filter} onChange={p.setFilter} counts={p.filterCounts} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {p.allCategories.map((cat) => {
          const visible = cat.results ? (p.filter === 'all' ? cat.results : cat.results.filter((r) => r.status === p.filter)) : null;
          if (cat.results && visible && visible.length === 0) return null;
          const fails = cat.results?.filter((r) => r.status === 'fail').length ?? 0;
          const warns = cat.results?.filter((r) => r.status === 'warn').length ?? 0;
          const isRunning = p.runningCategory === cat.title;
          return (
            <Card key={cat.title}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{cat.title}</span>
                    {fails > 0 && <Badge variant="destructive" className="text-xs">{fails} فشل</Badge>}
                    {warns > 0 && <Badge variant="secondary" className="text-xs">{warns} تحذير</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={p.running || !!p.runningCategory} onClick={() => p.onRunSingle(cat.title)} title={`تشغيل ${cat.title}`} aria-label={`تشغيل ${cat.title}`}>
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} aria-hidden="true" />
                  </Button>
                </div>
                {visible ? visible.map((r) => <CheckRow key={r.id} result={r} />) : (
                  <p className="text-xs text-muted-foreground text-center py-4">{cat.checksCount} فحص — اضغط ▶ لتشغيلها</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
