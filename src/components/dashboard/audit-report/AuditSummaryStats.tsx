import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, FileText, XCircle, ListChecks, type LucideIcon } from 'lucide-react';
import type { AuditFinding } from '@/constants/auditFindings';

interface AuditSummaryStatsProps {
  findings: AuditFinding[];
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  count: number;
  variantClass: string;
}

const StatCard = ({ icon: Icon, label, count, variantClass }: StatCardProps) => (
  <Card className="shadow-sm">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${variantClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{count}</p>
      </div>
    </CardContent>
  </Card>
);

const AuditSummaryStats = ({ findings }: AuditSummaryStatsProps) => {
  const total = findings.length;
  const implemented = findings.filter((f) => f.status === 'implemented').length;
  const documented = findings.filter((f) => f.status === 'documented').length;
  const rejected = findings.filter((f) => f.status === 'rejected').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard icon={ListChecks} label="إجمالي البنود" count={total} variantClass="bg-primary/10 text-primary" />
      <StatCard icon={CheckCircle2} label="منفّذ" count={implemented} variantClass="bg-success/10 text-success" />
      <StatCard icon={FileText} label="موثَّق" count={documented} variantClass="bg-muted text-muted-foreground" />
      <StatCard icon={XCircle} label="مرفوض جنائياً" count={rejected} variantClass="bg-warning/10 text-warning" />
    </div>
  );
};

export default AuditSummaryStats;
