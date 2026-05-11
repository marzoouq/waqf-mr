import { describe, it, expect, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { invoke } from './invoke';
import { ApiError } from './rpc';

beforeEach(() => {
  invokeMock.mockReset();
});

describe('invoke()', () => {
  it('returns data on 200 success', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await expect(invoke('fn')).resolves.toEqual({ ok: true });
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 400 validation', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { status: 400, message: 'bad' } });
    await expect(invoke('fn', {}, { maxAttempts: 3 })).rejects.toMatchObject({ category: 'validation' });
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 401 and calls onAuthError', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { status: 401, message: 'unauth' } });
    const onAuthError = vi.fn();
    await expect(invoke('fn', {}, { onAuthError })).rejects.toMatchObject({ category: 'auth' });
    expect(onAuthError).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('retries 3 times on 429 rate_limit then throws', async () => {
    vi.useFakeTimers();
    invokeMock.mockResolvedValue({ data: null, error: { status: 429, message: 'too many' } });
    const promise = invoke('fn', {}, { maxAttempts: 3 });
    promise.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toMatchObject({ category: 'rate_limit' });
    expect(invokeMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('retries on 500 server then succeeds', async () => {
    invokeMock
      .mockResolvedValueOnce({ data: null, error: { status: 503, message: 'down' } })
      .mockResolvedValueOnce({ data: 'ok', error: null });
    await expect(invoke('fn')).resolves.toBe('ok');
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it('classifies network TypeError', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: Object.assign(new TypeError('fetch failed'), {}),
    });
    await expect(invoke('fn', {}, { maxAttempts: 1 })).rejects.toMatchObject({ category: 'network' });
  });

  it('treats data.error as failure (Edge Function 200 + error body)', async () => {
    invokeMock.mockResolvedValue({ data: { error: 'Unauthorized' }, error: null });
    const onAuthError = vi.fn();
    await expect(invoke('fn', {}, { onAuthError })).rejects.toBeInstanceOf(ApiError);
    expect(onAuthError).toHaveBeenCalledTimes(1);
  });

  it('respects treatDataErrorAsFailure=false', async () => {
    invokeMock.mockResolvedValue({ data: { error: 'soft' }, error: null });
    await expect(invoke('fn', {}, { treatDataErrorAsFailure: false })).resolves.toEqual({ error: 'soft' });
  });
});
