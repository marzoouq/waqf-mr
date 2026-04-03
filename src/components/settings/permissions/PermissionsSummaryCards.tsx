/**
 * ملخص صلاحيات الأدوار — بطاقات Progress
 */
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface RoleSummary {
  key: string;
  label: string;
  color: string;
  total: number;
  enabled: number;
  percent: number;
}

interface Props {
  summaries: RoleSummary[];
}

const PermissionsSummaryCards = ({ summaries }: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {summaries.map(s => (
      <Card key={s.key} className="border-border/60">
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`font-semibold text-sm ${s.color}`}>{s.label}</span>
            <span className="text-xs text-muted-foreground">{s.enabled}/{s.total} قسم</span>
          </div>
          <Progress value={s.percent} className="h-2" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export default PermissionsSummaryCards;
