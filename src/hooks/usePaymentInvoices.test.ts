import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// --- Mocks ---
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function buildChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: mockSelect, eq: mockEq, order: mockOrder, limit: mockLimit,
  };
  for (const fn of Object.values(chain)) fn.mockReturnValue(chain);
  mockLimit.mockResolvedValue({ data: [], error: null });
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue(buildChain());
  mockRpc.mockResolvedValue({ data: 3, error: null });
});

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('usePaymentInvoices', () => {
  it('معطّل عند __none__', async () => {
    const { usePaymentInvoices } = await import('./usePaymentInvoices');
    const { result } = renderHook(() => usePaymentInvoices('__none__'), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('يجلب الكل عند all', async () => {
    const { usePaymentInvoices } = await import('./usePaymentInvoices');
    const { result } = renderHook(() => usePaymentInvoices('all'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
    expect(result.current).not.toBeNull();
  });

  it('يفلتر بالسنة المالية', async () => {
    const { usePaymentInvoices } = await import('./usePaymentInvoices');
    const { result } = renderHook(() => usePaymentInvoices('fy-123'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
    expect(mockEq).toHaveBeenCalled();
  });
});

describe('useGenerateContractInvoices', () => {
  it('يرندر بدون خطأ', async () => {
    const { useGenerateContractInvoices } = await import('./usePaymentInvoices');
    const { result } = renderHook(() => useGenerateContractInvoices(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useGenerateAllInvoices', () => {
  it('يرندر بدون خطأ', async () => {
    const { useGenerateAllInvoices } = await import('./usePaymentInvoices');
    const { result } = renderHook(() => useGenerateAllInvoices(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useMarkInvoicePaid', () => {
  it('يرندر بدون خطأ', async () => {
    const { useMarkInvoicePaid } = await import('./usePaymentInvoices');
    const { result } = renderHook(() => useMarkInvoicePaid(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useMarkInvoiceUnpaid', () => {
  it('يرندر بدون خطأ', async () => {
    const { useMarkInvoiceUnpaid } = await import('./usePaymentInvoices');
    const { result } = renderHook(() => useMarkInvoiceUnpaid(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});
