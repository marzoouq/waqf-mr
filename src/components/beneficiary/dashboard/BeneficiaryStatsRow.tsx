import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import { EstimatedShareBadge } from '@/components/common';
import { DISTRIBUTIONS_LABELS, FY_STATE_COPY } from '@/constants/beneficiaryCopy';

interface Distribution {
  id: string;
  amount: number;
  date: string;
  status: string;
}

interface FiscalYearProgress {
  percent: number;
  daysLeft: number;
  notStarted?: boolean;
}

interface BeneficiaryStatsRowProps {
  myShare: number;
  isClosed: boolean;
  distributions: Distribution[];
  fiscalYearLabel: string;
  fyProgress: FiscalYearProgress;
}

const BeneficiaryStatsRow = ({ myShare, isClosed, distributions, fiscalYearLabel, fyProgress }: BeneficiaryStatsRowProps) => {
  // N18: ابحث عن آخر مدفوع بتمرير واحد O(n) بدل sort+find
  const lastPaid = distributions.reduce<Distribution | null>((acc, d) => {
    if (d.status !== 'paid') return acc;
    if (!acc) return d;
    return new Date(d.date).getTime() > new Date(acc.date).getTime() ? d : acc;
  }, null);

  // CR-01: شارة حالة السنة
  const yearBadge = isClosed
    ? FY_STATE_COPY.closed.badge
    : fyProgress.notStarted
      ? FY_STATE_COPY.notStarted.badge
      : FY_STATE_COPY.active.badge;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {/* حصتي من الريع — CR-02: نعرض الرقم دائماً مع badge تقديرية/نهائية */}
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">حصتي من الريع</p>
                <EstimatedShareBadge isEstimated={!isClosed} />
              </div>
              <p className="text-lg sm:text-xl font-bold truncate">{fmt(myShare)} ر.س</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CR-09: آخر توزيع مدفوع */}
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-success/10 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{DISTRIBUTIONS_LABELS.lastPaid}</p>
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

      {/* السنة المالية */}
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">السنة المالية</p>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[11px]">{fiscalYearLabel || '—'}</Badge>
              <Badge variant="outline" className="text-[11px]">{yearBadge}</Badge>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-[width] duration-500" style={{ width: `${fyProgress.percent}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            {isClosed
              ? FY_STATE_COPY.closed.badge
              : fyProgress.notStarted
                ? FY_STATE_COPY.notStarted.badge
                : `متبقي ${fyProgress.daysLeft} يوم`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BeneficiaryStatsRow;
