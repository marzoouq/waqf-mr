/**
 * بطاقة ملخص الصحة — تعرض pass/warn/fail و Health Score و قائمة ذكية.
 */
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, XCircle, Activity } from 'lucide-react';
import type { CategoryResults, DiagnosticsSummary } from '@/lib/diagnostics/exporters';

interface Props {
  summary: DiagnosticsSummary;
  categories: CategoryResults[];
}

function topFails(categories: CategoryResults[], n = 5) {
  const out: { category: string; label: string; detail: string }[] = [];
  for (const c of categories) for (const r of c.results) if (r.status === 'fail') out.push({ category: c.category, label: r.label, detail: r.detail });
  return out.slice(0, n);
}

function topWarns(categories: CategoryResults[], n = 5) {
  const out: { category: string; label: string; detail: string }[] = [];
  for (const c of categories) for (const r of c.results) if (r.status === 'warn') out.push({ category: c.category, label: r.label, detail: r.detail });
  return out.slice(0, n);
}

function topPassCategories(categories: CategoryResults[], n = 3) {
  return categories
    .filter(c => c.results.length > 0 && c.results.every(r => r.status === 'pass'))
    .slice(0, n)
    .map(c => c.category);
}

export default function HealthSummaryCard({ summary, categories }: Props) {
  const { pass, warn, fail, healthScore } = summary;
  const fails = topFails(categories);
  const warns = topWarns(categories);
  const passCats = topPassCategories(categories);

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="w-8 h-8 text-success" />
            <div>
              <p className="text-2xl font-bold text-success">{pass}</p>
              <p className="text-xs text-muted-foreground">يعمل بشكل سليم</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
            <AlertTriangle className="w-8 h-8 text-warning" />
            <div>
              <p className="text-2xl font-bold text-warning">{warn}</p>
              <p className="text-xs text-muted-foreground">تحذير يحتاج مراجعة</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <XCircle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold text-destructive">{fail}</p>
              <p className="text-xs text-muted-foreground">يحتاج إصلاح فوري</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <Activity className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-primary">{healthScore}<span className="text-sm">/100</span></p>
              <p className="text-xs text-muted-foreground">درجة صحة النظام</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {passCats.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-success">✅ يعمل بالكامل</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc ps-4">
                {passCats.map(c => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}
          {warns.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-warning">⚠ تحذيرات</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc ps-4">
                {warns.map((w, i) => <li key={i}><span className="font-medium">{w.label}</span> — {w.detail.slice(0, 60)}</li>)}
              </ul>
            </div>
          )}
          {fails.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-destructive">❌ يحتاج إصلاح</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc ps-4">
                {fails.map((f, i) => <li key={i}><span className="font-medium">{f.label}</span> — {f.detail.slice(0, 60)}</li>)}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
