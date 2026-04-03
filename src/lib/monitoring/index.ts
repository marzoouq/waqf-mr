/**
 * واجهة مراقبة الأداء الموحّدة
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
