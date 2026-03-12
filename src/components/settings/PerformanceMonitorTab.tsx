import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Activity, RefreshCw, Trash2, Gauge, MemoryStick, Layers, Clock } from 'lucide-react';
import { getSlowQueries, clearSlowQueries } from '@/lib/performanceMonitor';
import { toast } from 'sonner';

interface PageMetrics {
  loadTime: number;
  domInteractive: number;
  ttfb: number;
  domNodes: number;
  jsHeapUsed: number | null;
  jsHeapTotal: number | null;
}

function collectMetrics(): PageMetrics {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const loadTime = nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0;
  const domInteractive = nav ? Math.round(nav.domInteractive - nav.startTime) : 0;
  const ttfb = nav ? Math.round(nav.responseStart - nav.requestStart) : 0;
  const domNodes = document.querySelectorAll('*').length;

  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
  const jsHeapUsed = mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : null;
  const jsHeapTotal = mem ? Math.round(mem.totalJSHeapSize / (1024 * 1024)) : null;

  return { loadTime, domInteractive, ttfb, domNodes, jsHeapUsed, jsHeapTotal };
}

function getStatusColor(value: number, thresholds: [number, number]): string {
  if (value <= thresholds[0]) return 'text-success';
  if (value <= thresholds[1]) return 'text-warning';
  return 'text-destructive';
}

const PerformanceMonitorTab = () => {
  const [metrics, setMetrics] = useState<PageMetrics>(() => collectMetrics());
  const slowQueries = getSlowQueries();

  const handleRefresh = useCallback(() => {
    setMetrics(collectMetrics());
    toast.success('تم تحديث المقاييس');
  }, []);

  const handleClear = useCallback(() => {
    clearSlowQueries();
    setMetrics(collectMetrics());
    toast.success('تم مسح سجل الاستعلامات البطيئة');
  }, []);

  return (
    <div className="space-y-6">
      {/* أزرار التحكم */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />
          تحديث المقاييس
        </Button>
        <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={handleClear}>
          <Trash2 className="w-4 h-4" />
          مسح السجل
        </Button>
      </div>

      {/* بطاقات المقاييس */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">تحميل الصفحة</p>
              <p className={`text-xl font-bold ${getStatusColor(metrics.loadTime, [2000, 5000])}`}>
                {metrics.loadTime}<span className="text-xs font-normal mr-1">ms</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/50">
              <Gauge className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DOM Interactive</p>
              <p className={`text-xl font-bold ${getStatusColor(metrics.domInteractive, [1000, 3000])}`}>
                {metrics.domInteractive}<span className="text-xs font-normal mr-1">ms</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Activity className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TTFB</p>
              <p className={`text-xl font-bold ${getStatusColor(metrics.ttfb, [200, 600])}`}>
                {metrics.ttfb}<span className="text-xs font-normal mr-1">ms</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/20">
              <Layers className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">عناصر DOM</p>
              <p className={`text-xl font-bold ${getStatusColor(metrics.domNodes, [1500, 3000])}`}>
                {metrics.domNodes.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ذاكرة JS */}
      {metrics.jsHeapUsed !== null && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MemoryStick className="w-5 h-5" />
              استخدام الذاكرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">مستخدم</p>
                <p className={`text-lg font-bold ${getStatusColor(metrics.jsHeapUsed!, [50, 150])}`}>
                  {metrics.jsHeapUsed} MB
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي</p>
                <p className="text-lg font-bold text-muted-foreground">{metrics.jsHeapTotal} MB</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">النسبة</p>
                <p className="text-lg font-bold">
                  {metrics.jsHeapTotal ? Math.round((metrics.jsHeapUsed! / metrics.jsHeapTotal) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* الاستعلامات البطيئة */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5" />
            الاستعلامات البطيئة
            {slowQueries.length > 0 && (
              <Badge variant="destructive" className="mr-2">{slowQueries.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            العمليات التي استغرقت أكثر من 3 ثوانٍ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {slowQueries.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد استعلامات بطيئة مسجلة — أداء ممتاز! 🎉</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden">
                {slowQueries.map((q, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-1">
                    <p className="font-medium text-sm">{q.label}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="text-destructive font-bold">{Math.round(q.durationMs!)}ms</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">العملية</TableHead>
                      <TableHead className="text-right">المدة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowQueries.map((q, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{q.label}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{Math.round(q.durationMs!)}ms</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitorTab;
