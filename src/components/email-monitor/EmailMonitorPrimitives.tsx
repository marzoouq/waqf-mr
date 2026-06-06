/**
 * مكونات عرضية مساعدة لصفحة مراقبة البريد الإلكتروني
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mail, CheckCircle2, AlertTriangle, XCircle, ShieldOff, Clock, AlertOctagon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { fmtDateTime } from '@/utils/format/format';

const STATUS_BADGE: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  sent: { label: 'مُرسلة', className: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 },
  pending: { label: 'قيد الإرسال', className: 'bg-info/10 text-info border-info/30', icon: Clock },
  failed: { label: 'فشلت', className: 'bg-warning/10 text-warning border-warning/30', icon: AlertTriangle },
  dlq: { label: 'فشل نهائي (DLQ)', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertOctagon },
  suppressed: { label: 'محجوبة', className: 'bg-muted text-muted-foreground border-border', icon: ShieldOff },
  bounced: { label: 'مرتدّة', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
  complained: { label: 'شكوى', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
};

export function EmailStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border', icon: Mail };
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', cfg.className)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

export function EmailStatCard({
  icon: Icon, label, value, color,
}: { icon: typeof Mail; label: string; value: number | string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function formatEmailDateTime(iso: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return fmtDateTime(d, { dateStyle: 'short', timeStyle: 'medium' });
  } catch { return iso; }
}
