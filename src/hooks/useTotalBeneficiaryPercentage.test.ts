import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTotalBeneficiaryPercentage } from './useTotalBeneficiaryPercentage';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>;

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useTotalBeneficiaryPercentage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('يعيد النسبة المئوية الإجمالية', async () => {
    mockRpc.mockResolvedValueOnce({ data: 85.5, error: null });
    const { result } = renderHook(() => useTotalBeneficiaryPercentage(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(85.5);
  });

  it('يعيد 0 عند null', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    const { result } = renderHook(() => useTotalBeneficiaryPercentage(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it('يعيد 0 عند قيمة سالبة', async () => {
    mockRpc.mockResolvedValueOnce({ data: -5, error: null });
    const { result } = renderHook(() => useTotalBeneficiaryPercentage(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it('يعيد 0 عند قيمة تتجاوز 200', async () => {
    mockRpc.mockResolvedValueOnce({ data: 250, error: null });
    const { result } = renderHook(() => useTotalBeneficiaryPercentage(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it('يرمي خطأ عند فشل RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    const { result } = renderHook(() => useTotalBeneficiaryPercentage(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
