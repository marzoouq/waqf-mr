import { ClipboardCheck, FileText, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { usePrint } from '@/hooks/ui/usePrint';
import { CLEANUP_REPORT } from '@/constants/cleanupReport';
import CleanupSummaryCards from '@/components/dashboard/cleanup/CleanupSummaryCards';
import TestFailuresList from '@/components/dashboard/cleanup/TestFailuresList';

const phaseTone: Record<'HIGH' | 'MED' | 'LOW', string> = {
  HIGH: 'bg-success/10 text-success border-success/30',
  MED: 'bg-warning/10 text-warning border-warning/30',
  LOW: 'bg-muted text-muted-foreground border-muted-foreground/20',
};

const CleanupReportPage = () => {
  const print = usePrint();
  const r = CLEANUP_REPORT;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="تقرير التنظيف الأخير"
          description="نتائج جنائية مفصّلة لآخر جولة حذف ملفات يتيمة (rg + build + 2062 اختبار)"
          icon={ClipboardCheck}
          actions={
            <Button variant="outline" size="sm" onClick={print} className="gap-2">
              <FileText className="w-4 h-4" />
              تصدير PDF
            </Button>
          }
        />

        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">تاريخ الجولة:</span>
              <span className="font-medium">{r.generatedAt}</span>
            </div>
            <div className="text-muted-foreground">
              <span>{r.round}</span>
            </div>
            <div className="sm:ms-auto text-xs text-muted-foreground">
              <span>false positives مرفوضة: </span>
              <span className="font-medium">{r.rejectedFalsePositives}</span>
            </div>
          </CardContent>
        </Card>

        <CleanupSummaryCards report={r} />

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold">الملفات المحذوفة</h2>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y">
                {r.deletedFiles.map((f) => (
                  <div key={f.path} className="p-3 sm:p-4 flex items-start gap-3 text-sm">
                    <Badge variant="outline" className={phaseTone[f.phase]}>
                      {f.phase}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <code className="block font-mono text-xs break-all">{f.path}</code>
                      <p className="mt-1 text-muted-foreground text-xs">{f.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold">فحوصات rg في كامل المشروع</h2>
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y">
                {r.rgChecks.map((c) => (
                  <div key={c.pattern} className="p-3 sm:p-4 flex items-start gap-3 text-sm">
                    <Badge
                      variant="outline"
                      className={
                        c.matches === 0
                          ? 'bg-success/10 text-success border-success/30'
                          : 'bg-warning/10 text-warning border-warning/30'
                      }
                    >
                      {c.matches} مطابقة
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <code className="block font-mono text-xs break-all">{c.pattern}</code>
                      {c.note && <p className="mt-1 text-muted-foreground text-xs">{c.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold">نتائج الاختبارات (Vitest)</h2>
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex flex-wrap items-center gap-2">
                <span>إجمالي: {r.tests.total}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-success">نجح: {r.tests.passed}</span>
                <span className="text-muted-foreground">|</span>
                <span className={r.tests.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                  فشل: {r.tests.failed}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">مجموعات: {r.tests.suites}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TestFailuresList failures={r.tests.failures} />
            </CardContent>
          </Card>
        </section>

        <p className="text-xs text-muted-foreground text-center pt-2">
          البيانات snapshot ثابت يُحدَّث يدوياً بعد كل جولة تنظيف. لا تُنفَّذ rg/build/tests في runtime المتصفح.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default CleanupReportPage;
