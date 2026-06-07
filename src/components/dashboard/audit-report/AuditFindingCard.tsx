import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCode2 } from 'lucide-react';
import type { AuditFinding, AuditStatus, AuditSeverity } from '@/constants/auditFindings';
import { AUDIT_STATUS_LABELS, AUDIT_SEVERITY_LABELS } from '@/constants/auditFindings';

interface AuditFindingCardProps {
  finding: AuditFinding;
}

const STATUS_STYLES: Record<AuditStatus, string> = {
  implemented: 'bg-success/10 text-success border-success/30',
  documented: 'bg-muted text-muted-foreground border-border',
  rejected: 'bg-warning/10 text-warning border-warning/30',
};

const SEVERITY_STYLES: Record<AuditSeverity, string> = {
  security: 'bg-destructive/10 text-destructive border-destructive/30',
  ux: 'bg-primary/10 text-primary border-primary/30',
  a11y: 'bg-accent/10 text-accent-foreground border-accent/30',
  consistency: 'bg-secondary/40 text-secondary-foreground border-border',
  performance: 'bg-warning/10 text-warning border-warning/30',
};

const AuditFindingCard = ({ finding }: AuditFindingCardProps) => (
  <Card className="shadow-sm">
    <CardContent className="p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs sm:text-sm px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
            {finding.id}
          </span>
          <h3 className="font-semibold text-sm sm:text-base">{finding.title}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <Badge variant="outline" className={STATUS_STYLES[finding.status]}>
            {AUDIT_STATUS_LABELS[finding.status]}
          </Badge>
          <Badge variant="outline" className={SEVERITY_STYLES[finding.severity]}>
            {AUDIT_SEVERITY_LABELS[finding.severity]}
          </Badge>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{finding.rationale}</p>

      <div className="space-y-1.5 pt-2 border-t border-border/50">
        <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
          <FileCode2 className="w-3.5 h-3.5" />
          الملفات المعدَّلة ({finding.files.length})
        </p>
        <ul className="space-y-1">
          {finding.files.map((file) => (
            <li key={`${file.path}:${file.lines}`} className="font-mono text-[11px] sm:text-xs bg-muted/40 rounded px-2 py-1 break-all">
              <span className="text-foreground">{file.path}</span>
              <span className="text-muted-foreground"> : {file.lines}</span>
            </li>
          ))}
        </ul>
      </div>
    </CardContent>
  </Card>
);

export default AuditFindingCard;
