import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sessionStorage
const mockStorage = new Map<string, string>();
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => mockStorage.get(k) ?? null,
  setItem: (k: string, v: string) => mockStorage.set(k, v),
  removeItem: (k: string) => mockStorage.delete(k),
});

beforeEach(() => {
  mockStorage.clear();
});

describe('lazyWithRetry', () => {
  it('يُصدّر دالة lazyWithRetry', async () => {
    const mod = await import('./lazyWithRetry');
    expect(typeof mod.lazyWithRetry).toBe('function');
  });

  it('يُرجع React.lazy component', async () => {
    const { lazyWithRetry } = await import('./lazyWithRetry');
    const Comp = lazyWithRetry(() =>
      Promise.resolve({ default: () => null })
    );
    // React.lazy يُرجع كائن بـ $$typeof
    expect(Comp).toBeDefined();
    expect((Comp as unknown as Record<string, unknown>).$$typeof).toBeDefined();
  });
});
