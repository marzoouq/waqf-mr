import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Gauge, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KpiSkeleton } from '@/components/SkeletonLoaders';
import { fmt } from '@/utils/format';

export interface KpiItem {
  label: string;
  value: number;
  suffix: string;
  color: string;
  progressColor: string;
  /** نسبة التغيير سنة بسنة (YoY) */
  yoyChange?: number | null;
  /** عكس اللون: ارتفاع = سيئ (مثل المصروفات) */
  invertColor?: boolean;
}

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
          {kpis.map((kpi, idx) => (
            <div key={idx} className="text-center space-y-1 sm:space-y-2 p-3 sm:p-4 rounded-lg bg-muted/30">
              <p className="text-xs sm:text-sm text-muted-foreground">{kpi.label}</p>
              <p className={`text-lg sm:text-xl md:text-3xl font-bold ${kpi.color}`}>
                {fmt(kpi.value)}{kpi.suffix}
              </p>
              {kpi.yoyChange != null && (
                <div className={`flex items-center justify-center gap-1 text-xs font-medium ${
                  kpi.yoyChange === 0 ? 'text-muted-foreground' :
                  (kpi.invertColor ? kpi.yoyChange > 0 : kpi.yoyChange > 0) 
                    ? (kpi.invertColor ? 'text-destructive' : 'text-success')
                    : (kpi.invertColor ? 'text-success' : 'text-destructive')
                }`}>
                  {kpi.yoyChange > 0 ? <TrendingUp className="w-3 h-3" /> : kpi.yoyChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  <span>{kpi.yoyChange > 0 ? '+' : ''}{kpi.yoyChange}% عن العام السابق</span>
                </div>
              )}
              {kpi.progressColor && (
                <Progress value={Math.min(kpi.value, 100)} className={`h-2 ${kpi.progressColor}`} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardKpiPanel;
