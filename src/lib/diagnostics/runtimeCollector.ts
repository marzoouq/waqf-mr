/**
 * جامع أخطاء التشغيل — يلتقط window.error و unhandledrejection
 * ويحفظ آخر 100 خطأ في sessionStorage ليستهلكها فحص runtime-errors-log.
 */
import { logger } from '@/lib/logger';

const STORAGE_KEY = 'diag_runtime_errors';
const MAX_ENTRIES = 100;

export interface RuntimeErrorEntry {
  ts: number;
  route: string;
  type: 'error' | 'unhandledrejection';
  message: string;
  stack?: string;
}

function safeRead(): RuntimeErrorEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function safeWrite(entries: RuntimeErrorEntry[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch { /* تجاهل quota */ }
}

// F5: قائمة أنماط تُسكت في «أخطاء التشغيل» — من مصادر خارجية لا يمكن إصلاحها (مثل web-vitals)
const SILENT_PATTERNS: RegExp[] = [
  /Deprecated API for given entry type/i,
];

function isSilenced(message: string): boolean {
  return SILENT_PATTERNS.some(rx => rx.test(message));
}

function push(entry: RuntimeErrorEntry): void {
  if (isSilenced(entry.message)) return;
  const all = safeRead();
  all.push(entry);
  safeWrite(all);
}

export function getRuntimeErrors(): RuntimeErrorEntry[] {
  return safeRead();
}

export function clearRuntimeErrors(): void {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* تجاهل */ }
}

let installed = false;

export function installRuntimeCollector(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;
  window.addEventListener('error', (e) => {
    push({
      ts: Date.now(),
      route: window.location.pathname,
      type: 'error',
      message: String(e.message ?? 'unknown'),
      stack: e.error?.stack ? String(e.error.stack).slice(0, 1500) : undefined,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    push({
      ts: Date.now(),
      route: window.location.pathname,
      type: 'unhandledrejection',
      message: typeof reason === 'string' ? reason : (reason?.message ?? 'Promise rejection'),
      stack: reason?.stack ? String(reason.stack).slice(0, 1500) : undefined,
    });
  });
  logger.info('[Diagnostics] runtimeCollector installed');
}
