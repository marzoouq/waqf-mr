/**
 * Barrel — lib/monitoring
 *
 * واجهة موحَّدة لمراقبة الأداء:
 *   - queryMonitor : قياس بطء الاستعلامات + reportPageLoadMetrics
 *   - pageMonitor  : تجميع وتلخيص بيانات تحميل الصفحات + اشتراكات live
 *   - webVitals    : مؤشرات Core Web Vitals (LCP/FCP/INP/CLS/TTFB)
 */
export {
  startPerfTimer,
  getSlowQueries,
  clearSlowQueries,
  reportPageLoadMetrics,
  type PerfEntry,
  type PerfTimerOptions,
} from './queryMonitor';

export {
  recordPageLoad,
  clearPageLoadEntries,
  getStoredEntries,
  getPagePerfSummaries,
  subscribePerfUpdates,
  getPerfRevision,
  notifyPerfUpdate,
  type PageLoadEntry,
  type PagePerfSummary,
} from './pageMonitor';

export {
  initWebVitals,
  getVitalsSnapshot,
  type VitalsSnapshot,
} from './webVitals';
