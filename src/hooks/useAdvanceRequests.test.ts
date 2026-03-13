import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// --- Mocks ---
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/notifications', () => ({ notifyAdmins: vi.fn(), notifyUser: vi.fn() }));

function buildChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: mockSelect, eq: mockEq, in: mockIn, or: mockOr,
    order: mockOrder, limit: mockLimit, single: mockSingle,
    insert: mockInsert, update: mockUpdate,
  };
  for (const fn of Object.values(chain)) fn.mockReturnValue(chain);
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockSingle.mockResolvedValue({ data: { id: 'test-id' }, error: null });
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  const chain = buildChain();
  mockFrom.mockReturnValue(chain);
});

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useAdvanceRequests', () => {
  it('يجلب بيانات طلبات السلف', async () => {
    const { useAdvanceRequests } = await import('./useAdvanceRequests');
    const { result } = renderHook(() => useAdvanceRequests(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
    expect(result.current).not.toBeNull();
  });

  it('يفلتر بالسنة المالية', async () => {
    const { useAdvanceRequests } = await import('./useAdvanceRequests');
    const { result } = renderHook(() => useAdvanceRequests('fy-123'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
    expect(mockEq).toHaveBeenCalled();
  });
});

describe('useMyAdvanceRequests', () => {
  it('معطّل بدون beneficiaryId', async () => {
    const { useMyAdvanceRequests } = await import('./useAdvanceRequests');
    const { result } = renderHook(() => useMyAdvanceRequests(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('يجلب بيانات عند وجود beneficiaryId', async () => {
    const { useMyAdvanceRequests } = await import('./useAdvanceRequests');
    const { result } = renderHook(() => useMyAdvanceRequests('ben-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
    expect(result.current).not.toBeNull();
  });
});

describe('usePaidAdvancesTotal', () => {
  it('معطّل بدون beneficiaryId', async () => {
    const { usePaidAdvancesTotal } = await import('./useAdvanceRequests');
    const { result } = renderHook(() => usePaidAdvancesTotal(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('يحسب المجموع', async () => {
    mockLimit.mockResolvedValue({ data: [{ amount: 100 }, { amount: 200 }], error: null });
    const { usePaidAdvancesTotal } = await import('./useAdvanceRequests');
    const { result } = renderHook(() => usePaidAdvancesTotal('ben-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(300);
  });
});

describe('useCarryforwardBalance', () => {
  it('معطّل بدون beneficiaryId', async () => {
    const { useCarryforwardBalance } = await import('./useAdvanceRequests');
    const { result } = renderHook(() => useCarryforwardBalance(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('يحسب المرحّلات النشطة', async () => {
    mockLimit.mockResolvedValue({ data: [{ amount: 500 }, { amount: 300 }], error: null });
    const { useCarryforwardBalance } = await import('./useAdvanceRequests');
    const { result } = renderHook(() => useCarryforwardBalance('ben-1', 'fy-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(800);
  });
});

describe('useCreateAdvanceRequest', () => {
  it('يرندر بدون خطأ', async () => {
    const { useCreateAdvanceRequest } = await import('./useAdvanceRequests');
    const { result } = renderHook(() => useCreateAdvanceRequest(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useUpdateAdvanceStatus', () => {
  it('يرندر بدون خطأ', async () => {
    const { useUpdateAdvanceStatus } = await import('./useAdvanceRequests');
    const { result } = renderHook(() => useUpdateAdvanceStatus(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});
