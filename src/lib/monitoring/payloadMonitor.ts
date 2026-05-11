/**
 * مراقبة حجم حمولات الطلبات/الاستجابات — DEV فقط
 * يُحذّر عند > 500KB، يُسجِّل error > 1MB.
 */
import { logger } from '@/lib/logger';

const WARN_BYTES = 500 * 1024;
const ERROR_BYTES = 1024 * 1024;

interface PayloadEntry {
  label: string;
  bytes: number;
  at: number;
}

const recentLargePayloads: PayloadEntry[] = [];

export function recordPayloadSize(label: string, bytes: number): void {
  if (!import.meta.env.DEV) return;
  if (bytes < WARN_BYTES) return;

  const kb = (bytes / 1024).toFixed(1);
  if (bytes >= ERROR_BYTES) {
    logger.error(`[Payload] حمولة ضخمة: "${label}" = ${kb}KB`);
  } else {
    logger.warn(`[Payload] حمولة كبيرة: "${label}" = ${kb}KB`);
  }

  recentLargePayloads.push({ label, bytes, at: Date.now() });
  if (recentLargePayloads.length > 50) recentLargePayloads.shift();
}

export function getLargePayloads(): readonly PayloadEntry[] {
  return recentLargePayloads;
}

export function clearLargePayloads(): void {
  recentLargePayloads.length = 0;
}
