import { describe, it, expect, beforeEach } from 'vitest';
import { collectAuditSignals } from './collectAuditSignals';

describe('collectAuditSignals', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('returns auditActive=false outside audit mode', () => {
    const s = collectAuditSignals();
    expect(s.auditActive).toBe(false);
    expect(s.queryClient.staleMinutes).toBe(5);
  });

  it('elevates staleMinutes when ?audit=1', () => {
    window.history.replaceState({}, '', '/?audit=1');
    const s = collectAuditSignals();
    expect(s.auditActive).toBe(true);
    expect(s.queryClient.elevated).toBe(true);
    expect(s.queryClient.staleMinutes).toBe(60);
    expect(s.realtime.disabled).toBe(true);
  });

  it('returns an array of pdfChunks (possibly empty)', () => {
    const s = collectAuditSignals();
    expect(Array.isArray(s.pdfChunks)).toBe(true);
  });
});
