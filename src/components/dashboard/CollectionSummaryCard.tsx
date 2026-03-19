import { lazy, Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const CollectionSummaryChart = lazy(() => import('@/components/dashboard/CollectionSummaryChart'));

interface CollectionSummaryCardProps {
  collectionSummary: {
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
    total: number;
    percentage: number;
    totalCollected: number;
    totalExpected: number;
  };
  collectionColor: { text: string; bar: string };
}

const CollectionSummaryCard = ({ collectionSummary, collectionColor }: CollectionSummaryCardProps) => {
  if (collectionSummary.total <= 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          ملخص التحصيل
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ErrorBoundary>
            <Suspense fallback={<div className="w-[180px] h-[180px] shrink-0 flex items-center justify-center"><Skeleton className="w-[140px] h-[140px] rounded-full" /></div>}>
              <CollectionSummaryChart onTime={collectionSummary.paidCount} late={collectionSummary.unpaidCount} partial={collectionSummary.partialCount} />
            </Suspense>
          </ErrorBoundary>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            <div className="text-center p-2 sm:p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm text-muted-foreground">محصّل بالكامل</span>
              </div>
              <p className="text-xl sm:text-3xl font-bold text-success">{collectionSummary.paidCount}</p>
              <Badge className="bg-success/20 text-success border-success/30 hover:bg-success/30">فاتورة</Badge>
            </div>

            {collectionSummary.partialCount > 0 && (
              <div className="text-center p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  <span className="text-sm text-muted-foreground">محصّل جزئياً</span>
                </div>
                <p className="text-3xl font-bold text-warning">{collectionSummary.partialCount}</p>
                <Badge className="bg-warning/20 text-warning border-warning/30 hover:bg-warning/30">فاتورة</Badge>
              </div>
            )}

            <div className="text-center p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span className="text-sm text-muted-foreground">متأخر</span>
              </div>
              <p className="text-3xl font-bold text-destructive">{collectionSummary.unpaidCount}</p>
              <Badge className="bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30">فاتورة</Badge>
            </div>

            <div className="text-center p-4 rounded-lg bg-muted/30 space-y-2">
              <span className="text-sm text-muted-foreground">نسبة التحصيل</span>
              <p className={`text-3xl font-bold ${collectionColor.text}`}>
                {collectionSummary.percentage}%
              </p>
              <Progress
                value={collectionSummary.percentage}
                className={`h-2 ${collectionColor.bar}`}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionSummaryCard;
