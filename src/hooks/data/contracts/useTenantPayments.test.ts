import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const { mockSelect, mockRpc } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((_table: string) => ({
      select: mockSelect,
    })),
    rpc: mockRpc,
  },
}));

// الكود يستخدم defaultNotify — نموكه بدل sonner
const mockNotify = vi.hoisted(() => ({
  success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(),
}));
vi.mock('@/lib/notify', () => ({ defaultNotify: mockNotify }));

import { useTenantPayments, useUpsertTenantPayment } from './useTenantPayments';

const wrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

const samplePayments = [
  { id: 'tp-1', contract_id: 'c-1', paid_months: 6, notes: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'tp-2', contract_id: 'c-2', paid_months: 12, notes: 'مسدد بالكامل', created_at: '2024-02-01', updated_at: '2024-02-01' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue({
    limit: vi.fn().mockResolvedValue({ data: samplePayments, error: null }),
  });
  mockRpc.mockResolvedValue({ data: { success: true }, error: null });
});

describe('useTenantPayments', () => {
  it('fetches all tenant payments', async () => {
    const { result } = renderHook(() => useTenantPayments(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(samplePayments);
  });

  it('handles fetch error', async () => {
    mockSelect.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'network error' } }),
    });
    const { result } = renderHook(() => useTenantPayments(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns empty array when no payments exist', async () => {
    mockSelect.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const { result } = renderHook(() => useTenantPayments(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useUpsertTenantPayment', () => {
  it('upserts payment via RPC and shows success toast', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 8 });
    expect(mockRpc).toHaveBeenCalledWith('upsert_tenant_payment', expect.objectContaining({
      p_contract_id: 'c-1',
      p_paid_months: 8,
    }));
    expect(mockNotify.success).toHaveBeenCalled();
  });

  it('passes notes as undefined when not provided', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 3 });
    expect(mockRpc).toHaveBeenCalledWith('upsert_tenant_payment', expect.objectContaining({
      p_notes: undefined,
    }));
  });

  it('passes notes when provided', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 12, notes: 'مسدد' });
    expect(mockRpc).toHaveBeenCalledWith('upsert_tenant_payment', expect.objectContaining({
      p_notes: 'مسدد',
    }));
    expect(mockNotify.success).toHaveBeenCalled();
  });

  it('calls upsert_tenant_payment RPC', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 1 });
    expect(mockRpc).toHaveBeenCalledWith('upsert_tenant_payment', expect.any(Object));
  });

  it('shows error toast on RPC failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rls denied' } });
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await expect(result.current.mutateAsync({ contract_id: 'c-1', paid_months: 5 })).rejects.toThrow();
    expect(mockNotify.error).toHaveBeenCalled();
  });

  it('handles zero paid_months', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 0 });
    expect(mockNotify.success).toHaveBeenCalled();
  });
});
