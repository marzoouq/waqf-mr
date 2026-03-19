import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Gauge } from 'lucide-react';
import { KpiSkeleton } from '@/components/SkeletonLoaders';
import { fmt } from '@/utils/format';

export interface KpiItem {
  label: string;
  value: number;
  suffix: string;
  color: string;
  progressColor: string;
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
