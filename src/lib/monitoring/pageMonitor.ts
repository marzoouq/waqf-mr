/**
 * تتبع أوقات تحميل الصفحات — يُسجّل وقت كل انتقال بين المسارات
 *
 * Batch 3: تسميات المسارات تُقرأ من `ALL_ROUTES` (routeRegistry) — مصدر حقيقة واحد.
 */
import { safeSessionGet, safeSessionSet, safeSessionRemove } from '@/lib/storage';
import { ALL_ROUTES } from '@/constants/routeRegistry';

export type PageMetricKind = 'load' | 'dwell';

export interface PageLoadEntry {
  path: string;
  label: string;
  durationMs: number;
  timestamp: number;
  /** نوع القياس — `load` لتحميل الصفحة الفعلي، `dwell` لمدة بقاء المستخدم. */
  kind?: PageMetricKind;
}

const MAX_ENTRIES = 100;
const STORAGE_KEY = 'page_perf_entries';

function getPageLabel(path: string): string {
  return ALL_ROUTES[path]?.title ?? path;
}

/** جلب السجلات المحفوظة */
export function getStoredEntries(): PageLoadEntry[] {
  return safeSessionGet<PageLoadEntry[]>(STORAGE_KEY, []);
}

/** حفظ سجل جديد — `kind` افتراضياً `load` للتوافق الخلفي. */
export function recordPageLoad(path: string, durationMs: number, kind: PageMetricKind = 'load'): void {
  const entries = getStoredEntries();
  entries.push({
    path,
    label: getPageLabel(path),
    durationMs: Math.round(durationMs),
    timestamp: Date.now(),
    kind,
  });

  while (entries.length > MAX_ENTRIES) entries.shift();

  safeSessionSet(STORAGE_KEY, entries);
}

/** مسح السجلات */
export function clearPageLoadEntries(): void {
  safeSessionRemove(STORAGE_KEY);
}

/** ملخص إحصائي مجمّع حسب المسار */
export interface PagePerfSummary {
  path: string;
  label: string;
  avgMs: number;
  maxMs: number;
  minMs: number;
  count: number;
  lastMs: number;
}

export function getPagePerfSummaries(): PagePerfSummary[] {
  const entries = getStoredEntries();
  const grouped: Record<string, PageLoadEntry[]> = {};

  for (const e of entries) {
    if (!grouped[e.path]) grouped[e.path] = [];
    grouped[e.path]!.push(e);
  }

  return Object.entries(grouped)
    .map(([path, items]) => {
      const durations = items.map(i => i.durationMs);
      return {
        path,
        label: getPageLabel(path),
        avgMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        maxMs: Math.max(...durations),
        minMs: Math.min(...durations),
        count: items.length,
        lastMs: items[items.length - 1]!.durationMs,
      };
    })
    .sort((a, b) => b.avgMs - a.avgMs);
}

/** إشعار المراقبين بتحديث البيانات */
let revision = 0;
const listeners = new Set<() => void>();

export function subscribePerfUpdates(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function getPerfRevision() { return revision; }

export function notifyPerfUpdate() {
  revision++;
  listeners.forEach(cb => cb());
}
