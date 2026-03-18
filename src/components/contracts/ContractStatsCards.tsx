import { fmt } from '@/utils/format';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';

interface ContractStats {
  total: number;
  active: number;
  activePercent: number;
  expired: number;
  totalRent: number;
  activeRent: number;
  expiringSoon: number;
}

interface ContractStatsCardsProps {
  stats: ContractStats;
  isLoading: boolean;
}

const ContractStatsCards = ({ stats, isLoading }: ContractStatsCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      <Card className="border-info/30 bg-info/5">
        <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-info/15 text-info"><FileText className="w-4 h-4 sm:w-5 sm:h-5" /></div>
          <div><p className="text-[10px] sm:text-xs text-muted-foreground">إجمالي العقود</p><p className="text-lg sm:text-xl font-bold">{stats.total}</p></div>
        </CardContent>
      </Card>
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-success/15 text-success"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /></div>
          <div><p className="text-[10px] sm:text-xs text-muted-foreground">العقود النشطة</p><p className="text-lg sm:text-xl font-bold">{stats.active} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">({stats.activePercent}%)</span></p></div>
        </CardContent>
      </Card>
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/15 text-destructive"><XCircle className="w-4 h-4 sm:w-5 sm:h-5" /></div>
          <div><p className="text-[10px] sm:text-xs text-muted-foreground">العقود المنتهية</p><p className="text-lg sm:text-xl font-bold">{stats.expired}</p></div>
        </CardContent>
      </Card>
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-accent/15 text-accent-foreground"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5" /></div>
          <div><p className="text-[10px] sm:text-xs text-muted-foreground">الإيرادات التعاقدية</p><p className="text-base sm:text-lg font-bold truncate">{stats.fmt(totalRent)} <span className="text-[10px] sm:text-xs font-normal">ر.س</span></p><p className="text-[10px] text-muted-foreground">نشط: {stats.fmt(activeRent)}</p></div>
        </CardContent>
      </Card>
      <Card className={`${stats.expiringSoon > 0 ? 'border-warning/40 bg-warning/10' : 'border-warning/20 bg-warning/5'}`}>
        <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className={`p-1.5 sm:p-2 rounded-lg ${stats.expiringSoon > 0 ? 'bg-warning/20 text-warning' : 'bg-warning/10 text-warning/60'}`}><AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" /></div>
          <div><p className="text-[10px] sm:text-xs text-muted-foreground">تنتهي خلال 3 أشهر</p><p className="text-lg sm:text-xl font-bold">{stats.expiringSoon}</p></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractStatsCards;
