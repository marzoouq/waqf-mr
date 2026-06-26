/**
 * بطاقات نظرة عامة — لوحة الواقف
 * Wave 3: تدعم AnimatedCounter للأرقام و MiniSparkline للاتجاه.
 */
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { AnimatedCounter, MiniSparkline } from '@/components/common';
import type { TrendColor } from '@/types/dashboard';

export interface WaqifStatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  bg: string;
  /** القيمة العددية الأصلية لتشغيل AnimatedCounter */
  rawValue?: number;
  decimals?: number;
  /** لاحقة عددية (مثل " ر.س") */
  numericSuffix?: string;
  /** سلسلة اتجاه آخر فترة */
  trend?: number[];
  trendColor?: TrendColor;
}

interface WaqifOverviewStatsProps {
  stats: WaqifStatItem[];
}

const WaqifOverviewStats = ({ stats }: WaqifOverviewStatsProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    {stats.map((stat, i) => {
      const hasRaw = typeof stat.rawValue === 'number' && Number.isFinite(stat.rawValue);
      const hasTrend = Array.isArray(stat.trend) && stat.trend.length > 1;
      return (
        <Card key={i} className="shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className="text-lg sm:text-xl font-bold truncate tabular-nums">
                  {hasRaw ? (
                    <AnimatedCounter
                      value={stat.rawValue as number}
                      decimals={stat.decimals ?? 0}
                      suffix={stat.numericSuffix ?? ''}
                    />
                  ) : stat.value}
                </p>
                {hasTrend && (
                  <MiniSparkline
                    data={stat.trend as number[]}
                    color={stat.trendColor ?? 'primary'}
                    className="mt-1 opacity-80"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default WaqifOverviewStats;
