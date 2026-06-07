/**
 * Deep Clean — يمسح الكاش، Service Workers، IndexedDB، Cache Storage
 * يحافظ على: جلسة Supabase (sb-*)، fiscal_year_id، Firebase Messaging
 */
import type { QueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { clearHistory } from '@/lib/diagnostics/history';
import { resetFallbackBanner } from '@/lib/notifications/fallbackPolling';

export type DeepCleanReport = {
  localStorageKeysCleared: number;
  sessionStorageKeysCleared: number;
  queryCacheCleared: boolean;
  indexedDbsDeleted: string[];
  serviceWorkersUnregistered: number;
  cachesDeleted: string[];
  errors: Array<{ step: string; message: string }>;
  durationMs: number;
};

// مفاتيح localStorage محمية (لا تُمسّ)
const LS_PROTECTED_PREFIXES = ['sb-', 'supabase.'];
const LS_PROTECTED_EXACT = new Set(['theme', 'i18nextLng']);

// مفاتيح localStorage تُمسح صراحة
const LS_CLEAR_PREFIXES = ['diagnostics_', 'tickPoll_', 'lovable-cache-', 'dismissed_warnings'];
const LS_CLEAR_EXACT = new Set(['error_log_queue', 'dismissed_warnings_v1']);

// sessionStorage: ما يُحفظ
const SS_PROTECTED = new Set(['fiscal_year_id']);

// IndexedDB: أسماء قواعد محمية
const IDB_PROTECTED_PATTERNS = [/^supabase/i, /^firebase/i, /^firebase-messaging/i, /^firebase-installations/i, /^firebase-heartbeat/i];

// Service Worker: scripts محمية
const SW_PROTECTED_SCRIPTS = [/firebase-messaging-sw/i, /firebase-cloud-messaging/i];

// Cache Storage: أسماء محمية
const CACHE_PROTECTED_PREFIXES = ['firebase-', 'fcm-'];
const CACHE_CLEAR_PREFIXES = ['workbox-', 'precache-', 'runtime-', 'lovable-'];

function isLsProtected(key: string): boolean {
  if (LS_PROTECTED_EXACT.has(key)) return true;
  return LS_PROTECTED_PREFIXES.some(p => key.startsWith(p));
}
function shouldClearLs(key: string): boolean {
  if (isLsProtected(key)) return false;
  if (LS_CLEAR_EXACT.has(key)) return true;
  return LS_CLEAR_PREFIXES.some(p => key.startsWith(p));
}
function isIdbProtected(name: string): boolean {
  return IDB_PROTECTED_PATTERNS.some(re => re.test(name));
}
function isSwProtected(scriptURL: string): boolean {
  return SW_PROTECTED_SCRIPTS.some(re => re.test(scriptURL));
}
function shouldClearCache(name: string): boolean {
  if (CACHE_PROTECTED_PREFIXES.some(p => name.startsWith(p))) return false;
  return CACHE_CLEAR_PREFIXES.some(p => name.startsWith(p));
}

export async function runDeepClean(opts: { queryClient?: QueryClient } = {}): Promise<DeepCleanReport> {
  const t0 = performance.now();
  const report: DeepCleanReport = {
    localStorageKeysCleared: 0,
    sessionStorageKeysCleared: 0,
    queryCacheCleared: false,
    indexedDbsDeleted: [],
    serviceWorkersUnregistered: 0,
    cachesDeleted: [],
    errors: [],
    durationMs: 0,
  };

  // 1) localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && shouldClearLs(k)) toRemove.push(k);
      }
      for (const k of toRemove) localStorage.removeItem(k);
      report.localStorageKeysCleared = toRemove.length;
    }
  } catch (e) {
    report.errors.push({ step: 'localStorage', message: (e as Error).message });
  }

  // 2) sessionStorage
  try {
    if (typeof sessionStorage !== 'undefined') {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && !SS_PROTECTED.has(k)) toRemove.push(k);
      }
      for (const k of toRemove) sessionStorage.removeItem(k);
      report.sessionStorageKeysCleared = toRemove.length;
    }
  } catch (e) {
    report.errors.push({ step: 'sessionStorage', message: (e as Error).message });
  }

  // 3) React Query
  try {
    if (opts.queryClient) {
      opts.queryClient.clear();
      report.queryCacheCleared = true;
    }
  } catch (e) {
    report.errors.push({ step: 'queryClient', message: (e as Error).message });
  }

  // 4) IndexedDB
  try {
    type IdbWithList = IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> };
    const idb = (typeof indexedDB !== 'undefined' ? indexedDB : null) as IdbWithList | null;
    if (idb?.databases) {
      const dbs = await idb.databases();
      for (const db of dbs) {
        const name = db.name;
        if (!name || isIdbProtected(name)) continue;
        try {
          await new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(new Error(`deleteDatabase failed: ${name}`));
            req.onblocked = () => resolve();
          });
          report.indexedDbsDeleted.push(name);
        } catch (e) {
          report.errors.push({ step: `idb:${name}`, message: (e as Error).message });
        }
      }
    }
  } catch (e) {
    report.errors.push({ step: 'indexedDB', message: (e as Error).message });
  }

  // 5) Service Workers
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        const script = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? '';
        if (isSwProtected(script)) continue;
        try {
          const ok = await reg.unregister();
          if (ok) report.serviceWorkersUnregistered++;
        } catch (e) {
          report.errors.push({ step: `sw:${script}`, message: (e as Error).message });
        }
      }
    }
  } catch (e) {
    report.errors.push({ step: 'serviceWorker', message: (e as Error).message });
  }

  // 6) Cache Storage
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      for (const n of names) {
        if (!shouldClearCache(n)) continue;
        try {
          const ok = await caches.delete(n);
          if (ok) report.cachesDeleted.push(n);
        } catch (e) {
          report.errors.push({ step: `cache:${n}`, message: (e as Error).message });
        }
      }
    }
  } catch (e) {
    report.errors.push({ step: 'caches', message: (e as Error).message });
  }

  // 7) إعادة ضبط ميزات التشخيص
  try {
    clearHistory();
    resetFallbackBanner();
    window.dispatchEvent(new CustomEvent('lovable:clear-runtime-errors'));
  } catch (e) {
    report.errors.push({ step: 'reset-banners', message: (e as Error).message });
  }

  report.durationMs = Math.round(performance.now() - t0);
  logger.info('[DeepClean] التقرير:', report);
  return report;
}
