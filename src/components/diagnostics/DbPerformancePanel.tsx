/**
 * DbPerformancePanel — أداء قاعدة البيانات والاستعلامات البطيئة
 */
import { useDbStats } from '@/hooks/data/diagnostics/useDbStats';
import { getSlowQueries } from '@/lib/monitoring/queryMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, Zap, HardDrive, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DbPerformancePanel() {
  const { data, isLoading, refetch, isFetching } = useDbStats();
  const slow = getSlowQueries();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">جاري القراءة من قاعدة البيانات...</p>
      ) : data ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4" /> الاتصالات النشطة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{data.total_connections}</span>
                <span className="text-muted-foreground text-sm">/ {data.max_connections}</span>
              </div>
              <Progress value={data.saturation_pct} />
              <p className="text-xs text-muted-foreground">
                إشباع: {data.saturation_pct}% • نشطة: {data.active_connections}
              </p>
              {data.saturation_pct >= 80 && (
                <Badge variant="destructive" className="w-fit">⚠️ اقترب من الحد الأقصى</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <HardDrive className="w-4 h-4" /> حجم قاعدة البيانات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.db_size_mb.toLocaleString('ar-SA')} MB</div>
              <p className="text-xs text-muted-foreground mt-1">
                {(data.db_size_bytes / 1024 / 1024 / 1024).toFixed(3)} GB
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-center py-8 text-destructive">فشل قراءة إحصائيات قاعدة البيانات</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4" /> الاستعلامات البطيئة ({slow.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slow.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">لا توجد استعلامات بطيئة مسجّلة</p>
          ) : (
            <ul className="space-y-1 max-h-96 overflow-auto">
              {slow.slice().reverse().map((q, i) => (
                <li key={i} className="flex justify-between items-center py-1.5 border-b last:border-0 text-sm">
                  <span className="font-mono truncate">{q.label}</span>
                  <Badge variant={q.durationMs && q.durationMs > 5000 ? 'destructive' : 'outline'}>
                    {Math.round(q.durationMs ?? 0)}ms
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
