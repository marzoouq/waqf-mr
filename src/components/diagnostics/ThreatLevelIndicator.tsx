/**
 * ThreatLevelIndicator — مؤشر مستوى التهديد مع لون ديناميكي
 */
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ThreatAssessment } from '@/lib/diagnostics/threatScore';

interface Props {
  assessment: ThreatAssessment;
}

const ICONS = {
  safe: ShieldCheck,
  low: Shield,
  medium: Shield,
  high: ShieldAlert,
  critical: ShieldX,
} as const;

export default function ThreatLevelIndicator({ assessment }: Props) {
  const Icon = ICONS[assessment.level];
  return (
    <Card className="border-2" style={{ borderColor: assessment.color }}>
      <CardContent className="py-4 flex items-center gap-4">
        <Icon className="w-10 h-10 shrink-0" style={{ color: assessment.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg">مستوى التهديد: {assessment.label}</h3>
            <Badge variant="outline" className="font-mono">{assessment.score} نقطة</Badge>
          </div>
          {assessment.reasons.length > 0 ? (
            <ul className="mt-1 text-sm text-muted-foreground space-y-0.5">
              {assessment.reasons.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">لا توجد إشارات مقلقة خلال آخر 24 ساعة.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
