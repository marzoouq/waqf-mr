/**
 * collectAuditSignals — يجمع الإشارات الحية أثناء وضع التدقيق (?audit=1).
 * دالة pure تعتمد على window/performance فقط، بلا async أو شبكة.
 */
import { isAuditMode } from '@/lib/auditMode';
import { getSwRefusalReason } from '@/lib/pwaBootstrap';

export interface PdfChunkMetric {
  name: string;
  sizeKb: number;
  durationMs: number;
}

export interface AuditSignals {
  auditActive: boolean;
  realtime: { disabled: boolean; reason: string };
  sw: { registered: boolean; refusalReason: string | null };
  queryClient: { elevated: boolean; staleMinutes: number };
  pdfChunks: PdfChunkMetric[];
  polling: { stopped: boolean; reason: string };
}

function getPdfChunks(): PdfChunkMetric[] {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) return [];
  try {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return entries
      .filter((e) => /vendor-pdf|arabic-reshaper|qrcode/i.test(e.name))
      .map((e) => ({
        name: e.name.split('/').pop() ?? e.name,
        sizeKb: Math.round((e.transferSize || e.encodedBodySize || 0) / 1024),
        durationMs: Math.round(e.duration),
      }));
  } catch { return []; }
}

function isSwRegistered(): boolean {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  return Boolean(navigator.serviceWorker.controller);
}

export function collectAuditSignals(): AuditSignals {
  const audit = isAuditMode();
  const refusalReason = getSwRefusalReason();
  return {
    auditActive: audit,
    realtime: {
      disabled: audit,
      reason: audit ? 'وضع التدقيق نشط — Realtime channels لا تُسجَّل' : 'نشط',
    },
    sw: {
      registered: isSwRegistered(),
      refusalReason,
    },
    queryClient: {
      elevated: audit,
      staleMinutes: audit ? 60 : 5,
    },
    pdfChunks: getPdfChunks(),
    polling: {
      stopped: audit,
      reason: audit ? 'app_settings / get_public_stats معطّلة' : 'تعمل وفق staleTime',
    },
  };
}
