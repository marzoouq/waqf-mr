import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          then: (cb: (v: unknown) => void) => cb({ data: [], error: null }),
        })),
      })),
    })),
    rpc: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpsertContractAllocations } from './useContractAllocations';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>;

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useUpsertContractAllocations', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('لا ينفّذ شيئاً عند مصفوفة فارغة', async () => {
    const { result } = renderHook(() => useUpsertContractAllocations(), { wrapper: createWrapper() });
    result.current.mutate([]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
