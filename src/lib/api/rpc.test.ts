import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing rpc
const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { rpc, ApiError } from './rpc';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('rpc()', () => {
  it('returns data on success', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await expect(rpc('any')).resolves.toEqual({ ok: true });
  });

  it('does not retry on permission errors (42501)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: '42501', message: 'denied' } });
    await expect(rpc('any')).rejects.toMatchObject({ category: 'permission' });
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry on auth errors (401)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { status: 401, message: 'unauth' } });
    await expect(rpc('any')).rejects.toMatchObject({ category: 'auth' });
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry on validation errors (23505)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: '23505', message: 'unique' } });
    await expect(rpc('any')).rejects.toMatchObject({ category: 'validation' });
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('retries on server errors then succeeds', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { status: 503, message: 'down' } })
      .mockResolvedValueOnce({ data: 'ok', error: null });
    await expect(rpc('any')).resolves.toBe('ok');
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  it('retries up to maxAttempts then throws ApiError', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { status: 500, message: 'boom' } });
    await expect(rpc('any', undefined, { maxAttempts: 3 })).rejects.toBeInstanceOf(ApiError);
    expect(rpcMock).toHaveBeenCalledTimes(3);
  });

  it('classifies network failure', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: Object.assign(new TypeError('fetch failed'), {}),
    });
    await expect(rpc('any', undefined, { maxAttempts: 1 })).rejects.toMatchObject({ category: 'network' });
  });

  it('retries 3 times on 429 rate_limit then throws', async () => {
    vi.useFakeTimers();
    rpcMock.mockResolvedValue({ data: null, error: { status: 429, message: 'too many' } });
    const promise = rpc('any', undefined, { maxAttempts: 3 });
    promise.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toMatchObject({ category: 'rate_limit' });
    expect(rpcMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('applies exponential backoff between retries (250ms, 500ms)', async () => {
    vi.useFakeTimers();
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { status: 500, message: 'a' } })
      .mockResolvedValueOnce({ data: null, error: { status: 500, message: 'b' } })
      .mockResolvedValueOnce({ data: 'ok', error: null });
    const promise = rpc('any', undefined, { maxAttempts: 3 });
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(250);
    expect(rpcMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toBe('ok');
    expect(rpcMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
