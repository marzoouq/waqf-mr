import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Gauge, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KpiSkeleton, AnimatedCounter } from '@/components/common';

export type { KpiItem } from '@/types/dashboard';
import type { KpiItem } from '@/types/dashboard';

interface DashboardKpiPanelProps {
  kpis: KpiItem[];
  isLoading: boolean;
}

const DashboardKpiPanel = ({ kpis, isLoading }: DashboardKpiPanelProps) => {
  if (isLoading) return <KpiSkeleton />;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          مؤشرات الأداء الرئيسية (KPI)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {kpis.map((kpi) => {
            // D-04: إصلاح تعبير YoY الميت — منطق ألوان واضح ومُعبّر
            const yoyChange = kpi.yoyChange ?? 0;
            const isPositive = yoyChange > 0;
            const isGood = kpi.invertColor ? !isPositive : isPositive;
            const yoyColor =
              yoyChange === 0 ? 'text-muted-foreground' : isGood ? 'text-success' : 'text-destructive';

            return (
              <div key={kpi.label} className="text-center space-y-1 sm:space-y-2 p-3 sm:p-4 rounded-lg bg-muted/30">
                <p className="text-xs sm:text-sm text-muted-foreground">{kpi.label}</p>
                <p className={`text-lg sm:text-xl md:text-3xl font-bold ${kpi.color}`}>
                  {kpi.value === 0 && !kpi.suffix
                    ? '—'
                    : <AnimatedCounter value={kpi.value} decimals={kpi.decimals ?? 0} suffix={kpi.suffix} />}
                </p>
                {kpi.yoyChange !== null && kpi.yoyChange !== undefined && (
                  <div className={`flex items-center justify-center gap-1 text-xs font-medium ${yoyColor}`}>
                    {yoyChange > 0 ? <TrendingUp className="w-3 h-3" /> : yoyChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    <span>{yoyChange > 0 ? '+' : ''}{yoyChange}% عن العام السابق</span>
                  </div>
                )}
                {kpi.progressColor && (
                  <Progress value={Math.min(kpi.value, 100)} className={`h-2 ${kpi.progressColor}`} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(DashboardKpiPanel);
