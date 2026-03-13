import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  },
}));

import { usePrefetchAccounts } from './usePrefetchAccounts';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('usePrefetchAccounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a function', () => {
    const { result } = renderHook(() => usePrefetchAccounts(), { wrapper: createWrapper() });
    expect(typeof result.current).toBe('function');
  });

  it('prefetch does not throw when called', () => {
    const { result } = renderHook(() => usePrefetchAccounts(), { wrapper: createWrapper() });
    expect(() => result.current()).not.toThrow();
  });

  it('returns stable reference across renders', () => {
    const { result, rerender } = renderHook(() => usePrefetchAccounts(), { wrapper: createWrapper() });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
