import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockRpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mockRpc },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDistributeShares } from './useDistribute';
import React from 'react';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useDistributeShares', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('ينفّذ التوزيع بنجاح عبر RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: { success: true, with_share: 3, with_deficit: 0 }, error: null });

    const { result } = renderHook(() => useDistributeShares(), { wrapper: createWrapper() });
    result.current.mutate({
      account_id: 'acc-1',
      fiscal_year_id: 'fy-1',
      distributions: [
        { beneficiary_id: 'b1', beneficiary_name: 'أحمد', share_amount: 1000, advances_paid: 0, carryforward_deducted: 0, net_amount: 1000, deficit: 0 },
      ],
      total_distributed: 1000,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledWith('execute_distribution', expect.objectContaining({ p_account_id: 'acc-1' }));
  });

  it('يتعامل مع خطأ RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

    const { result } = renderHook(() => useDistributeShares(), { wrapper: createWrapper() });
    result.current.mutate({
      account_id: 'acc-1',
      distributions: [],
      total_distributed: 0,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('يحوّل beneficiary_user_id undefined إلى null', async () => {
    mockRpc.mockResolvedValueOnce({ data: { success: true, with_share: 1, with_deficit: 0 }, error: null });

    const { result } = renderHook(() => useDistributeShares(), { wrapper: createWrapper() });
    result.current.mutate({
      account_id: 'acc-1',
      distributions: [
        { beneficiary_id: 'b1', beneficiary_name: 'X', beneficiary_user_id: undefined, share_amount: 100, advances_paid: 0, carryforward_deducted: 0, net_amount: 100, deficit: 0 },
      ],
      total_distributed: 100,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_distributions[0].beneficiary_user_id).toBeNull();
  });
});
