/** تأجيل أدوات المراقبة إلى وقت الخمول لتحرير main thread أثناء الإقلاع */
type IdleFn = (cb: () => void) => void;

const idle: IdleFn =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb) =>
        (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
    : (cb) => setTimeout(cb, 1500);

export function initDeferredMonitoring(): void {
  idle(() => {
    import('@/lib/monitoring').then((m) => m.reportPageLoadMetrics());
    import('@/lib/monitoring/webVitals').then((m) => m.initWebVitals());
  });
}
