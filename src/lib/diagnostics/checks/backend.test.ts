import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkBackendEdgeHealthPing } from './backend';

describe('checkBackendEdgeHealthPing', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  const mockResponse = (status: number, body = '') =>
    ({ status, text: () => Promise.resolve(body) }) as unknown as Response;

  it('200 → pass with status in detail', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse(200, 'ok'));
    const r = await checkBackendEdgeHealthPing();
    expect(r.status).toBe('pass');
    expect(r.detail).toContain('status=200');
  });

  it('401 → pass (محمية بسر) and does not throw', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse(401, JSON.stringify({ error: 'Unauthorized' })),
    );
    const r = await checkBackendEdgeHealthPing();
    expect(r.status).toBe('pass');
    expect(r.detail).toContain('status=401');
    expect(r.detail).toContain('محمية');
  });

  it('503 → warn', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse(503));
    const r = await checkBackendEdgeHealthPing();
    expect(r.status).toBe('warn');
    expect(r.detail).toContain('status=503');
  });

  it('network error → fail', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    const r = await checkBackendEdgeHealthPing();
    expect(r.status).toBe('fail');
    expect(r.detail).toContain('network_error');
  });
});
