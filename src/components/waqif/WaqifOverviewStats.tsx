/**
 * بطاقات نظرة عامة — لوحة الواقف
 */
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  bg: string;
}

interface WaqifOverviewStatsProps {
  stats: StatItem[];
}

const WaqifOverviewStats = ({ stats }: WaqifOverviewStatsProps) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    {stats.map((stat, i) => (
      <Card key={i} className="shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{stat.title}</p>
              <p className="text-lg sm:text-xl font-bold truncate tabular-nums">{stat.value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default WaqifOverviewStats;
