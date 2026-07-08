import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { StatsGridSkeleton, AnimatedCounter, MiniSparkline } from '@/components/common';
import YoYBadge from './YoYBadge';


export type { StatItem } from '@/types/dashboard';
import type { StatItem } from '@/types/dashboard';

interface DashboardStatsGridProps {
  stats: StatItem[];
  isLoading: boolean;
}

const DashboardStatsGrid = ({ stats, isLoading }: DashboardStatsGridProps) => {
  if (isLoading) return <StatsGridSkeleton count={stats.length || 11} />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, index) => {
        const hasRaw = typeof stat.rawValue === 'number' && Number.isFinite(stat.rawValue);
        const hasTrend = Array.isArray(stat.trend) && stat.trend.length > 1;
        return (
          <Link key={stat.title} to={stat.link} className="block" aria-label={`فتح صفحة ${stat.title}`}>
            <Card className="shadow-sm hover:shadow-md transition-[transform,box-shadow] hover:scale-[1.02] cursor-pointer motion-safe:animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-tight">{stat.title}</p>
                    <p className={cn(
                      'text-base sm:text-lg md:text-xl lg:text-2xl font-bold mt-1 tabular-nums',
                      hasRaw ? 'truncate' : 'break-words'
                    )}>
                      {hasRaw ? (
                        <AnimatedCounter
                          value={stat.rawValue as number}
                          decimals={stat.decimals ?? 0}
                          prefix={stat.prefix ?? ''}
                          suffix={stat.numericSuffix ?? ''}
                        />
                      ) : (
                        stat.value
                      )}
                    </p>
                    {('yoyChange' in stat) && stat.yoyChange !== undefined && (
                      <YoYBadge changePercent={stat.yoyChange} invertColor={stat.invertColor} className="mt-0.5" />
                    )}
                    {hasTrend && (
                      <MiniSparkline
                        data={stat.trend as number[]}
                        color={stat.trendColor ?? 'primary'}
                        className="mt-1 opacity-80"
                      />
                    )}
                  </div>
                  <div className={`w-9 h-9 sm:w-12 sm:h-12 ${stat.color} rounded-lg sm:rounded-xl flex items-center justify-center shrink-0`} aria-hidden="true">
                    <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

export default memo(DashboardStatsGrid);
