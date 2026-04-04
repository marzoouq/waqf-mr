import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp } from 'lucide-react';
import { fmt } from '@/utils/format/format';

interface Distribution {
  id: string;
  amount: number;
  date: string;
  status: string;
}

interface FiscalYearProgress {
  percent: number;
  daysLeft: number;
}

interface BeneficiaryStatsRowProps {
  myShare: number;
  isClosed: boolean;
  distributions: Distribution[];
  fiscalYearLabel: string;
  fyProgress: FiscalYearProgress;
}

const BeneficiaryStatsRow = ({ myShare, isClosed, distributions, fiscalYearLabel, fyProgress }: BeneficiaryStatsRowProps) => {
  const lastPaid = [...distributions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .find(d => d.status === 'paid');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {/* حصتي من الريع */}
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">حصتي من الريع</p>
              {!isClosed ? (
                <p className="text-sm font-medium text-muted-foreground">تُحسب عند الإقفال</p>
              ) : (
                <p className="text-lg sm:text-xl font-bold truncate">{fmt(myShare)} ر.س</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* آخر توزيع مستلم */}
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-success/10 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">آخر توزيع مستلم</p>
              {lastPaid ? (
                <>
                  <p className="text-lg sm:text-xl font-bold truncate">
                    {fmt(Number(lastPaid.amount))} ر.س
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(lastPaid.date).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد توزيعات</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* تقدم السنة المالية */}
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">السنة المالية</p>
            <Badge variant="outline" className="text-[11px]">{fiscalYearLabel || '—'}</Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div <div className="h-full bg-primary rounded-full transition-[width] duration-500" style={{ width: `${fyProgress.percent}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            {isClosed ? 'مُقفلة' : `متبقي ${fyProgress.daysLeft} يوم`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BeneficiaryStatsRow;
