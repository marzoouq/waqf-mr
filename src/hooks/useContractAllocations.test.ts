import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockRpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: mockSelect }),
    rpc: mockRpc,
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContractAllocations, useUpsertContractAllocations } from './useContractAllocations';
import React from 'react';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useContractAllocations', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('يجلب التخصيصات بنجاح', async () => {
    const mockData = [{ id: 'a1', contract_id: 'c1', fiscal_year_id: 'fy1', period_start: '2024-01-01', period_end: '2024-12-31', allocated_payments: 12, allocated_amount: 12000, created_at: '' }];
    mockSelect.mockReturnValue({ limit: () => ({ eq: () => ({ data: mockData, error: null }) }) });

    const { result } = renderHook(() => useContractAllocations('fy1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useUpsertContractAllocations', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('لا ينفّذ شيئاً عند مصفوفة فارغة', async () => {
    const { result } = renderHook(() => useUpsertContractAllocations(), { wrapper: createWrapper() });
    result.current.mutate([]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
