import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { StatsGridSkeleton } from '@/components/SkeletonLoaders';
import YoYBadge from '@/components/dashboard/YoYBadge';
import type { LucideIcon } from 'lucide-react';

export interface StatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  link: string;
  yoyChange?: number | null;
  invertColor?: boolean;
}

interface DashboardStatsGridProps {
  stats: StatItem[];
  isLoading: boolean;
}

const DashboardStatsGrid = ({ stats, isLoading }: DashboardStatsGridProps) => {
  if (isLoading) return <StatsGridSkeleton count={stats.length || 11} />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, index) => (
        <Link key={index} to={stat.link} className="block">
          <Card className="shadow-sm hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-tight">{stat.title}</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1 truncate tabular-nums">{stat.value}</p>
                  {('yoyChange' in stat) && stat.yoyChange !== undefined && (
                    <YoYBadge changePercent={stat.yoyChange} invertColor={stat.invertColor} className="mt-0.5" />
                  )}
                </div>
                <div className={`w-9 h-9 sm:w-12 sm:h-12 ${stat.color} rounded-lg sm:rounded-xl flex items-center justify-center shrink-0`}>
                  <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default DashboardStatsGrid;
