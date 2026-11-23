import { memo } from 'react';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KpiSkeleton, AnimatedCounter } from '@/components/common';
import SectionHeading from '@/components/layout/SectionHeading';

export type { KpiItem } from '@/types/dashboard';
import type { KpiItem } from '@/types/dashboard';

interface DashboardKpiPanelProps {
  kpis: KpiItem[];
  isLoading: boolean;
}

/** مؤشرات الأداء — صفوف مختصرة بشريط تقدم */
const DashboardKpiPanel = ({ kpis, isLoading }: DashboardKpiPanelProps) => {
  if (isLoading) return <KpiSkeleton />;
  if (kpis.length === 0) return null;

  return (
    <section aria-label="مؤشرات الأداء">
      <SectionHeading title="مؤشرات الأداء" />
      <div className="rounded-2xl border bg-card shadow-sm divide-y">
        {kpis.map((kpi) => {
          const yoyChange = kpi.yoyChange ?? 0;
          const isPositive = yoyChange > 0;
          const isGood = kpi.invertColor ? !isPositive : isPositive;
          const yoyColor = yoyChange === 0 ? 'text-muted-foreground' : isGood ? 'text-success' : 'text-destructive';

          return (
            <div key={kpi.id ?? kpi.label} className="p-4 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className={`text-xl font-bold tabular-nums ${kpi.color}`}>
                  {kpi.value === 0 && !kpi.suffix
                    ? '—'
                    : <AnimatedCounter value={kpi.value} decimals={kpi.decimals ?? 0} suffix={kpi.suffix} />}
                </p>
              </div>
              {kpi.progressColor && (
                <Progress value={Math.min(kpi.value, 100)} className={`h-1.5 ${kpi.progressColor}`} />
              )}
              {kpi.yoyChange !== null && kpi.yoyChange !== undefined && (
                <p className={`flex items-center gap-1 text-xs font-medium ${yoyColor}`}>
                  {yoyChange > 0 ? <TrendingUp className="w-3 h-3" /> : yoyChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  <span>{yoyChange > 0 ? '+' : ''}{yoyChange}% عن العام السابق</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default memo(DashboardKpiPanel);
