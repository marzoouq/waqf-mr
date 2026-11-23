import { memo } from 'react';
import { Link } from 'react-router-dom';
import { StatsGridSkeleton, AnimatedCounter, MiniSparkline } from '@/components/common';
import SectionHeading from '@/components/layout/SectionHeading';
import YoYBadge from './YoYBadge';
import { cn } from '@/lib/cn';

export type { StatItem } from '@/types/dashboard';
import type { StatItem } from '@/types/dashboard';

interface DashboardStatsGridProps {
  stats: StatItem[];
  isLoading: boolean;
}

/** لون البلاطة الصغيرة للأيقونة — مشتق من لون البطاقة دون ألوان ثابتة */
const TILE_TONE: Record<string, string> = {
  'bg-primary': 'bg-primary/10 text-primary',
  'bg-secondary': 'bg-secondary/15 text-secondary-foreground',
  'bg-destructive': 'bg-destructive/10 text-destructive',
  'bg-success': 'bg-success/10 text-success',
  'bg-muted': 'bg-muted text-muted-foreground',
};

const DashboardStatsGrid = ({ stats, isLoading }: DashboardStatsGridProps) => {
  if (isLoading) return <StatsGridSkeleton count={stats.length || 7} />;

  return (
    <section aria-label="ملخص السنة">
      <SectionHeading title="ملخص السنة" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {stats.map((stat, index) => {
          const hasRaw = typeof stat.rawValue === 'number' && Number.isFinite(stat.rawValue);
          const hasTrend = Array.isArray(stat.trend) && stat.trend.length > 1;
          return (
            <Link
              key={stat.title}
              to={stat.link}
              aria-label={`فتح صفحة ${stat.title}`}
              className="group block rounded-2xl border bg-card p-3.5 sm:p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:animate-fade-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center gap-2">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TILE_TONE[stat.color] ?? TILE_TONE['bg-primary'])} aria-hidden="true">
                  <stat.icon className="h-4 w-4" />
                </span>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-tight">{stat.title}</p>
              </div>
              <p className={cn('mt-3 text-xl sm:text-2xl font-bold tabular-nums text-foreground', hasRaw ? 'truncate' : 'text-base sm:text-lg break-words')}>
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
              <div className="mt-1 flex items-center justify-between gap-2 min-h-[18px]">
                {('yoyChange' in stat) && stat.yoyChange !== undefined ? (
                  <YoYBadge changePercent={stat.yoyChange} invertColor={stat.invertColor} />
                ) : <span />}
                {hasTrend && (
                  <MiniSparkline data={stat.trend as number[]} color={stat.trendColor ?? 'primary'} className="opacity-70 max-w-[60%]" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default memo(DashboardStatsGrid);
