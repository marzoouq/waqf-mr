/**
 * بطاقات إحصائيات الدعم الفني
 */
import { Card, CardContent } from '@/components/ui/card';
import { Clock, ArrowUpCircle, Bug, CheckCircle, Activity, Star } from 'lucide-react';

interface SupportStatsCardsProps {
  openTickets: number;
  inProgressTickets: number;
  errorsLast24h: number;
  resolvedTickets: number;
  avgResolutionTime: string | null;
  avgRating: { avg: string; count: number } | null;
}

function StatCard({ icon: Icon, label, value, color, isText }: { icon: typeof Clock; label: string; value: number | string; color: string; isText?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-8 h-8 ${color}`} />
        <div>
          <p className={`${isText ? 'text-lg' : 'text-2xl'} font-bold`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SupportStatsCards({ openTickets, inProgressTickets, errorsLast24h, resolvedTickets, avgResolutionTime, avgRating }: SupportStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <StatCard icon={Clock} label="مفتوحة" value={openTickets} color="text-status-approved-foreground" />
      <StatCard icon={ArrowUpCircle} label="قيد المعالجة" value={inProgressTickets} color="text-warning" />
      <StatCard icon={Bug} label="أخطاء 24 ساعة" value={errorsLast24h} color="text-destructive" />
      <StatCard icon={CheckCircle} label="تم حلها" value={resolvedTickets} color="text-success" />
      <StatCard icon={Activity} label="متوسط الحل" value={avgResolutionTime ?? '—'} color="text-primary" isText />
      <StatCard icon={Star} label="متوسط التقييم" value={avgRating ? `${avgRating.avg} ★` : '—'} color="text-star-rating" isText />
    </div>
  );
}
