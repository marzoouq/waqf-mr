/**
 * بطاقة مراقبة أداء الصفحات — تعرض أوقات التحميل في لوحة التحكم
 */
import { useMemo, useState, useSyncExternalStore } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Activity, Trash2, RotateCcw } from 'lucide-react';
import { getPagePerfSummaries, clearPageLoadEntries, getStoredEntries, subscribePerfUpdates, getPerfRevision, notifyPerfUpdate, type PagePerfSummary } from '@/lib/pagePerformanceTracker';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export { notifyPerfUpdate } from '@/lib/pagePerformanceTracker';

/** لون الشريط حسب الوقت */
function getBarColor(ms: number): string {
  if (ms <= 800) return '[&>div]:bg-success';
  if (ms <= 2000) return '[&>div]:bg-warning';
  return '[&>div]:bg-destructive';
}

function getStatusLabel(ms: number): { text: string; className: string } {
  if (ms <= 800) return { text: 'سريع', className: 'text-success' };
  if (ms <= 2000) return { text: 'متوسط', className: 'text-warning' };
  return { text: 'بطيء', className: 'text-destructive' };
}

const PagePerformanceCard = () => {
  useSyncExternalStore(subscribe, getSnapshot);
  const [showAll, setShowAll] = useState(false);

  const summaries = useMemo(() => getPagePerfSummaries(), [revision]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalEntries = useMemo(() => getStoredEntries().length, [revision]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayed: PagePerfSummary[] = showAll ? summaries : summaries.slice(0, 6);

  // الحد الأقصى لتطبيع الشريط
  const maxAvg = Math.max(...summaries.map(s => s.avgMs), 1);

  if (summaries.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            مراقبة أداء الصفحات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            لم تُسجَّل بيانات أداء بعد — تصفّح الصفحات لبدء التتبع
          </p>
        </CardContent>
      </Card>
    );
  }

  const globalAvg = Math.round(summaries.reduce((s, e) => s + e.avgMs, 0) / summaries.length);
  const globalStatus = getStatusLabel(globalAvg);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5 text-primary" />
          مراقبة أداء الصفحات
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{totalEntries} قياس</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  clearPageLoadEntries();
                  notifyPerfUpdate();
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>مسح السجلات</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => notifyPerfUpdate()}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تحديث</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ملخص عام */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
          <span className="text-sm font-medium">متوسط الأداء العام</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${globalStatus.className}`}>
              {globalAvg}ms — {globalStatus.text}
            </span>
          </div>
        </div>

        {/* تفاصيل كل صفحة */}
        <div className="space-y-3">
          {displayed.map((s) => {
            const status = getStatusLabel(s.avgMs);
            const barValue = Math.min((s.avgMs / maxAvg) * 100, 100);
            return (
              <div key={s.path} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[50%]">{s.label}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{s.count} زيارة</span>
                    <span className={`font-bold ${status.className}`}>
                      {s.avgMs}ms
                    </span>
                    <span className={`text-[10px] ${status.className}`}>
                      {status.text}
                    </span>
                  </div>
                </div>
                <Progress value={barValue} className={`h-1.5 ${getBarColor(s.avgMs)}`} />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>أقل: {s.minMs}ms</span>
                  <span>أعلى: {s.maxMs}ms</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* عرض الكل */}
        {summaries.length > 6 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowAll(prev => !prev)}
          >
            {showAll ? 'عرض أقل' : `عرض الكل (${summaries.length} صفحة)`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PagePerformanceCard;
