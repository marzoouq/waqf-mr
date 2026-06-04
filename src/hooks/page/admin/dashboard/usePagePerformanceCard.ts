/**
 * usePagePerformanceCard — Page Hook لـ PagePerformanceCard (S6-1).
 *
 * يعزل كل المنطق (useSyncExternalStore + useState + useMemo) عن UI
 * التزاماً بـ Page Hook Pattern (Core Rule).
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  clearPageLoadEntries,
  getPagePerfSummaries,
  getPerfRevision,
  getStoredEntries,
  notifyPerfUpdate,
  subscribePerfUpdates,
  type PagePerfSummary,
} from '@/lib/monitoring';

const COLLAPSED_LIMIT = 6;

export interface PagePerformanceCardCtx {
  summaries: PagePerfSummary[];
  displayed: PagePerfSummary[];
  totalEntries: number;
  showAll: boolean;
  toggleShowAll: () => void;
  hasMore: boolean;
  isEmpty: boolean;
  globalAvg: number;
  maxAvg: number;
  clear: () => void;
  refresh: () => void;
}

export const usePagePerformanceCard = (): PagePerformanceCardCtx => {
  const rev = useSyncExternalStore(subscribePerfUpdates, getPerfRevision);
  const [showAll, setShowAll] = useState(false);

  // rev (revision من useSyncExternalStore) هو إشارة التحديث الوحيدة
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summaries = useMemo<PagePerfSummary[]>(() => getPagePerfSummaries(), [rev]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totalEntries = useMemo<number>(() => getStoredEntries().length, [rev]);

  const displayed = useMemo<PagePerfSummary[]>(
    () => (showAll ? summaries : summaries.slice(0, COLLAPSED_LIMIT)),
    [summaries, showAll],
  );

  const maxAvg = useMemo(() => Math.max(...summaries.map(s => s.avgMs), 1), [summaries]);

  const globalAvg = useMemo(() => {
    if (summaries.length === 0) return 0;
    return Math.round(summaries.reduce((s, e) => s + e.avgMs, 0) / summaries.length);
  }, [summaries]);

  const toggleShowAll = useCallback(() => setShowAll(prev => !prev), []);
  const clear = useCallback(() => {
    clearPageLoadEntries();
    notifyPerfUpdate();
  }, []);
  const refresh = useCallback(() => notifyPerfUpdate(), []);

  return {
    summaries,
    displayed,
    totalEntries,
    showAll,
    toggleShowAll,
    hasMore: summaries.length > COLLAPSED_LIMIT,
    isEmpty: summaries.length === 0,
    globalAvg,
    maxAvg,
    clear,
    refresh,
  };
};
