import { FileCheck, CalendarDays, CheckCircle2, FileText, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { useAuditReportFinalPage } from '@/hooks/page/admin/reports/useAuditReportFinalPage';
import AuditSummaryStats from '@/components/dashboard/audit-report/AuditSummaryStats';
import AuditFindingCard from '@/components/dashboard/audit-report/AuditFindingCard';

const AuditReportFinalPage = () => {
  const { findings, meta, handlePrint } = useAuditReportFinalPage();

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="تقرير التدقيق النهائي"
          description="نتائج التحقق الجنائي لجولة لوحة المستفيد (B1–B15) مع روابط الملفات المعدَّلة"
          icon={FileCheck}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/dashboard/cleanup-report">
                  <ClipboardCheck className="w-4 h-4" />
                  تقرير التنظيف الأخير
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <FileText className="w-4 h-4" />
                تصدير PDF
              </Button>
            </div>
          }
        />


        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">تاريخ الجولة:</span>
              <span className="font-medium">{meta.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-muted-foreground">الاختبارات:</span>
              <span className="font-medium">{meta.testsPassed}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground shrink-0">المرجع:</span>
              <code className="font-mono text-xs bg-background/60 rounded px-1.5 py-0.5 truncate">
                {meta.reportPath}
              </code>
            </div>
          </CardContent>
        </Card>

        <AuditSummaryStats findings={findings} />

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold">تفاصيل البنود</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {findings.map((finding) => (
              <AuditFindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AuditReportFinalPage;
