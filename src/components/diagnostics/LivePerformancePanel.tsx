/**
 * LivePerformancePanel — لوحة أداء حي: FPS + ذاكرة + شبكة
 * يستخدم requestAnimationFrame + PerformanceObserver داخل useEffect (يتوقف عند الخروج من التبويب).
 */
import { useEffect, useState } from 'react';
import { Activity, Cpu, Wifi } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface Metrics {
  fps: number;
  memoryMB: number | null;
  memoryLimitMB: number | null;
  navigationEntries: number;
  resourceEntries: number;
  onlineStatus: boolean;
}

export default function LivePerformancePanel() {
  const [metrics, setMetrics] = useState<Metrics>({
    fps: 0, memoryMB: null, memoryLimitMB: null,
    navigationEntries: 0, resourceEntries: 0, onlineStatus: navigator.onLine,
  });

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();

    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- performance.memory غير قياسي
        const mem = (performance as any).memory as { usedJSHeapSize?: number; jsHeapSizeLimit?: number } | undefined;
        setMetrics({
          fps: frames,
          memoryMB: mem?.usedJSHeapSize ? Math.round(mem.usedJSHeapSize / 1048576) : null,
          memoryLimitMB: mem?.jsHeapSizeLimit ? Math.round(mem.jsHeapSizeLimit / 1048576) : null,
          navigationEntries: performance.getEntriesByType('navigation').length,
          resourceEntries: performance.getEntriesByType('resource').length,
          onlineStatus: navigator.onLine,
        });
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const fpsColor = metrics.fps >= 50 ? 'text-emerald-500' : metrics.fps >= 30 ? 'text-amber-500' : 'text-destructive';
  const memPct = metrics.memoryMB && metrics.memoryLimitMB
    ? Math.round((metrics.memoryMB / metrics.memoryLimitMB) * 100) : null;

  return (
    <div dir="rtl" className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" /> إطارات في الثانية (FPS)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl font-bold ${fpsColor}`}>{metrics.fps}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.fps >= 50 ? 'أداء ممتاز' : metrics.fps >= 30 ? 'أداء مقبول' : 'أداء منخفض'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4" /> ذاكرة JavaScript
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.memoryMB !== null ? (
            <>
              <div className="text-4xl font-bold">{metrics.memoryMB}<span className="text-lg text-muted-foreground"> MB</span></div>
              <p className="text-xs text-muted-foreground mt-1">
                من أصل {metrics.memoryLimitMB} MB {memPct !== null ? `(${memPct}%)` : ''}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-muted-foreground">غير متاح</div>
              <p className="text-xs text-muted-foreground mt-1">المتصفح لا يوفر performance.memory</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wifi className="w-4 h-4" /> الشبكة والموارد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{metrics.resourceEntries}</div>
          <p className="text-xs text-muted-foreground mt-1">
            مورد محمَّل • {metrics.onlineStatus ? (
              <span className="text-emerald-500">متصل</span>
            ) : (
              <span className="text-destructive">غير متصل</span>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
