/**
 * AuditTreePage — شجرة التدقيق المحاسبي مع فحص تلقائي (قراءة فقط).
 */
import { GitBranch, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { useAuditTreePage } from '@/hooks/page/admin/financial/useAuditTreePage';
import type { AuditTreeNode } from '@/hooks/data/audit/useAuditReconciliation';

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : Number(n).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SEVERITY: Record<string, { label: string; cls: string }> = {
  high: { label: 'عالية', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  medium: { label: 'متوسطة', cls: 'bg-warning/10 text-warning border-warning/30' },
  low: { label: 'منخفضة', cls: 'bg-muted text-muted-foreground' },
};

const Row = ({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) => (
  <div className={cn('flex items-center justify-between gap-3 py-2 border-b last:border-0', warn && 'text-destructive')}>
    <span className="text-sm">{label}{sub && <span className="block text-xs text-muted-foreground">{sub}</span>}</span>
    <span className="font-semibold tabular-nums">{value}</span>
  </div>
);

const TreeNode = ({ node }: { node: AuditTreeNode }) => (
  <details className="rounded-md border p-2" open>
    <summary className="cursor-pointer flex justify-between gap-2 text-sm font-semibold">
      <span>{node.label}</span><span className="tabular-nums">{fmt(node.amount)}</span>
    </summary>
    <div className="mt-2 space-y-1 pr-4">
      {(node.children ?? []).map((c) => {
        const gap = c.invoiced != null && Math.abs((c.invoiced ?? 0) - c.amount) > 0.01;
        return (
          <Row key={c.label} label={c.label} value={fmt(c.amount)} warn={gap}
            sub={`فواتير مسددة: ${c.paid_count ?? 0} (${fmt(c.invoiced)}) — سندات قبض: ${c.receipt_count ?? 0}`} />
        );
      })}
    </div>
  </details>
);

const AuditTreePage = () => {
  const h = useAuditTreePage();
  const d = h.data;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <PageHeaderCard
          title="شجرة التدقيق"
          description={`ربط فواتير الإيجار وسندات القبض والصرف بقائمة الدخل والمصروفات والقائمة الختامية${h.yearLabel ? ` — ${h.yearLabel}` : ''}`}
          icon={GitBranch}
          actions={
            <Button onClick={h.runCheck} disabled={h.isLoading || !h.hasYear}>
              <RefreshCw className={cn('w-4 h-4', h.isLoading && 'animate-spin')} /> تشغيل الفحص
            </Button>
          }
        />

        {!h.hasYear && <Card><CardContent className="p-6 text-center text-muted-foreground">اختر سنة مالية محددة لعرض شجرة التدقيق</CardContent></Card>}
        {h.error && <Card className="border-destructive/40"><CardContent className="p-4 text-destructive">تعذّر تشغيل الفحص</CardContent></Card>}

        {d && (
          <>
            <Card className={cn(h.issues.length ? 'border-destructive/40 bg-destructive/5' : 'border-success/40 bg-success/5')}>
              <CardContent className="p-4 flex items-center gap-3">
                {h.issues.length
                  ? <AlertTriangle className="w-5 h-5 text-destructive" />
                  : <ShieldCheck className="w-5 h-5 text-success" />}
                <span className="font-semibold">
                  {h.issues.length ? `${h.issues.length} ملاحظة (${h.highCount} عالية الأهمية)` : 'سليم — كل السجلات متطابقة'}
                </span>
                <span className="text-xs text-muted-foreground mr-auto">آخر فحص: {new Date(d.checked_at).toLocaleString('ar-SA')}</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">القائمة الختامية</CardTitle></CardHeader>
              <CardContent>
                <Row label="إجمالي قيود الدخل" value={fmt(d.income_total)} />
                <Row label="إجمالي فواتير الإيجار المسددة" value={fmt(d.paid_invoices_total)} warn={Math.abs(h.incomeGap) > 0.01}
                  sub={Math.abs(h.incomeGap) > 0.01 ? `فرق ${fmt(h.incomeGap)} (دخل غير إيجاري أو غير مرتبط)` : undefined} />
                <Row label="إجمالي المصروفات" value={fmt(d.expense_total)} />
                <Row label="الإيرادات في القائمة الختامية" value={d.status === 'closed' ? fmt(d.statement_income) : 'تُحسب عند الإقفال'} />
                <Row label="المصروفات في القائمة الختامية" value={d.status === 'closed' ? fmt(d.statement_expenses) : 'تُحسب عند الإقفال'} />
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">الإيرادات: عقار ← عقد ← فواتير وسندات</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {d.income_tree.length ? d.income_tree.map(n => <TreeNode key={n.label} node={n} />) : <p className="text-sm text-muted-foreground">لا توجد إيرادات</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">المصروفات: نوع ← مصروفات وسندات صرف</CardTitle></CardHeader>
                <CardContent>
                  {d.expense_tree.length ? d.expense_tree.map(n => (
                    <Row key={n.label} label={n.label} value={fmt(n.amount)}
                      sub={`${n.count ?? 0} مصروف — ${n.voucher_count ?? 0} سند صرف معتمد`} />
                  )) : <p className="text-sm text-muted-foreground">لا توجد مصروفات</p>}
                </CardContent>
              </Card>
            </div>

            {h.issues.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">نتائج الفحص التلقائي</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {h.issues.map((i, idx) => (
                    <div key={`${i.code}-${idx}`} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0 text-sm">
                      <Badge variant="outline" className={SEVERITY[i.severity]?.cls}>{SEVERITY[i.severity]?.label}</Badge>
                      <span>{i.message}</span>
                      {i.amount != null && <span className="tabular-nums text-muted-foreground mr-auto">{fmt(i.amount)}{i.expected != null && ` / المتوقع ${fmt(i.expected)}`}</span>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AuditTreePage;
