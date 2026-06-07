import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Search, PackageCheck, FlaskConical, type LucideIcon } from 'lucide-react';
import type { CleanupReport } from '@/constants/cleanupReport';

interface CleanupSummaryCardsProps {
  report: CleanupReport;
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  variantClass: string;
}

const StatCard = ({ icon: Icon, label, value, variantClass }: StatCardProps) => (
  <Card className="shadow-sm">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${variantClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const CleanupSummaryCards = ({ report }: CleanupSummaryCardsProps) => {
  const rgClean = report.rgChecks.filter((c) => c.matches === 0).length;
  const buildOk = report.build.status === 'pass';
  const testsOk = report.tests.status === 'pass';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        icon={Trash2}
        label="ملفات محذوفة"
        value={String(report.deletedFiles.length)}
        variantClass="bg-primary/10 text-primary"
      />
      <StatCard
        icon={Search}
        label="فحوصات rg نظيفة"
        value={`${rgClean} / ${report.rgChecks.length}`}
        variantClass="bg-muted text-muted-foreground"
      />
      <StatCard
        icon={PackageCheck}
        label="البناء الإنتاجي"
        value={buildOk ? 'ناجح' : 'فاشل'}
        variantClass={buildOk ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
      />
      <StatCard
        icon={FlaskConical}
        label="الاختبارات"
        value={`${report.tests.passed} / ${report.tests.total}`}
        variantClass={testsOk ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
      />
    </div>
  );
};

export default CleanupSummaryCards;
