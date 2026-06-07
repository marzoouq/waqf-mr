import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAuditMode } from './auditMode';

describe('isAuditMode', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { search: '' } as unknown as Location);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('false في الوضع العادي', () => {
    expect(isAuditMode()).toBe(false);
  });

  it('true عند ?audit=1', () => {
    vi.stubGlobal('location', { search: '?audit=1' } as unknown as Location);
    expect(isAuditMode()).toBe(true);
  });

  it('true عند UA لـ Lighthouse', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 Chrome-Lighthouse',
    });
    expect(isAuditMode()).toBe(true);
  });
});
