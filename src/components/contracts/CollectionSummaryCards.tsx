/**
 * بطاقات ملخص التحصيل + شريط التقدم العام
 */
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Banknote, TrendingUp, TrendingDown, FileWarning } from 'lucide-react';
import { fmt } from '@/utils/format';
import type { CollectionSummary } from '@/hooks/page/useCollectionData';

interface CollectionSummaryCardsProps {
  summary: CollectionSummary;
  expectedLabel: string;
}

export default function CollectionSummaryCards({ summary, expectedLabel }: CollectionSummaryCardsProps) {
  return (
    <>
      {/* بطاقات الملخص */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{expectedLabel}</p>
              <p className="text-lg font-bold">{fmt(summary.totalExpected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المحصّل</p>
              <p className="text-lg font-bold text-success">{fmt(summary.totalCollected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المتأخر</p>
              <p className="text-lg font-bold text-destructive">{fmt(summary.totalOverdue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <FileWarning className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">نسبة التحصيل</p>
              <p className="text-lg font-bold">{summary.collectionRate.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* شريط التحصيل العام */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">معدل التحصيل العام</span>
            <span className="text-sm text-muted-foreground">
              {summary.completeCount} مكتمل من {summary.total} عقد
              {summary.overdueCount > 0 && <span className="text-destructive mr-2">• {summary.overdueCount} متأخر</span>}
            </span>
          </div>
          <Progress
            value={summary.collectionRate}
            className={`h-3 ${
              summary.collectionRate >= 80 ? '[&>div]:bg-success' :
              summary.collectionRate >= 50 ? '[&>div]:bg-warning' :
              '[&>div]:bg-destructive'
            }`}
          />
        </CardContent>
      </Card>
    </>
  );
}
