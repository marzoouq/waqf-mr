/**
 * @deprecated استخدم '@/lib/monitoring' بدلاً من هذا الملف
 */
export {
  recordPageLoad,
  clearPageLoadEntries,
  getStoredEntries,
  getPagePerfSummaries,
  subscribePerfUpdates,
  getPerfRevision,
  notifyPerfUpdate,
} from '@/lib/monitoring';
export type { PageLoadEntry, PagePerfSummary } from '@/lib/monitoring';
