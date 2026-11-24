import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import SectionHeading from '@/components/layout/SectionHeading';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertTriangle, Inbox, Info } from 'lucide-react';
import { ErrorBoundary } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import { COLLECTION_SUMMARY_RULE_AR } from '@/constants/collectionRules';

// recharts يُحمَّل lazily لاستبعاده من حزمة AdminDashboard الأولية
const CollectionSummaryChart = lazy(() => import('@/components/dashboard/kpi/CollectionSummaryChart'));

interface CollectionSummaryCardProps {
  collectionSummary: {
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
    /** عدد الفواتير المتأخرة فعلياً (بعد تاريخ الاستحقاق) — مصدر RPC */
    overdueCount?: number;
    paidLikeCount?: number;
    total: number;
    percentage: number;
    totalCollected: number;
    totalExpected: number;
  };
  collectionColor: { text: string; bar: string };
}

const CollectionSummaryCard = ({ collectionSummary, collectionColor }: CollectionSummaryCardProps) => {
  if (collectionSummary.total <= 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center">
          <Inbox className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">لا توجد فواتير دفع لهذه السنة المالية</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-label="ملخص التحصيل">
    <SectionHeading title="ملخص التحصيل" />
    <Card className="shadow-sm rounded-2xl h-full">
      <CardContent className="pt-5">
        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex items-center gap-4">
            <div className="h-[120px] w-[120px] shrink-0">
              <ErrorBoundary>
                <Suspense fallback={<Skeleton className="h-[120px] w-[120px] rounded-full" />}>
                  <CollectionSummaryChart onTime={collectionSummary.paidCount} late={collectionSummary.overdueCount ?? collectionSummary.unpaidCount} partial={collectionSummary.partialCount} />
                </Suspense>
              </ErrorBoundary>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">نسبة التحصيل</p>
              <p className={`text-4xl font-bold tabular-nums leading-tight ${collectionColor.text}`}>{collectionSummary.percentage}%</p>
              <Progress value={collectionSummary.percentage} className={`mt-2 h-1.5 w-28 ${collectionColor.bar}`} />
              <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">من {collectionSummary.total} فاتورة مستحقة</p>
            </div>
          </div>

          <ul className="divide-y rounded-xl border bg-muted/30">
            <StatusRow icon={<CheckCircle className="h-4 w-4 text-success" />} label="محصّل بالكامل" value={collectionSummary.paidCount} tone="text-success" />
            <StatusRow icon={<Clock className="h-4 w-4 text-warning" />} label="محصّل جزئياً" value={collectionSummary.partialCount} tone="text-warning" />
            <StatusRow icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="متأخر" value={collectionSummary.overdueCount ?? collectionSummary.unpaidCount} tone="text-destructive" />
          </ul>
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground border-t pt-3">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{COLLECTION_SUMMARY_RULE_AR}</span>
        </p>
      </CardContent>
    </Card>
    </section>
  );
};

const StatusRow = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) => (
  <li className="flex items-center justify-between gap-3 px-4 py-2.5">
    <span className="flex items-center gap-2 text-sm text-foreground">{icon}{label}</span>
    <span className="flex items-baseline gap-1">
      <span className={`text-lg font-bold tabular-nums ${tone}`}>{value}</span>
      <Badge variant="outline" className="text-[10px] font-normal">فاتورة</Badge>
    </span>
  </li>
);

export default CollectionSummaryCard;
