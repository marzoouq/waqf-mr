/**
 * أرشيف آخر 10 تشغيلات للتشخيص — مخزَّن في localStorage.
 */
import { logger } from '@/lib/logger';

export interface HistoryEntry {
  at: string; // ISO
  total: number;
  pass: number;
  warn: number;
  fail: number;
  info: number;
  healthScore: number;
}

const KEY = 'diag_history_v1';
const MAX = 10;

export function getHistory(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch (e) {
    logger.warn('[diagnostics/history] فشل القراءة:', e);
    return [];
  }
}

export function pushRun(entry: Omit<HistoryEntry, 'at'>): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  const next: HistoryEntry[] = [{ at: new Date().toISOString(), ...entry }, ...getHistory()].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    logger.warn('[diagnostics/history] فشل الكتابة:', e);
  }
  return next;
}

export function clearHistory(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
