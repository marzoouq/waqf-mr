import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// موك useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, role: 'admin' }),
}));

// موك sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// موك Supabase
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockLimit = vi.fn();
const mockRange = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();
const mockSelect = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })),
    rpc: mockRpc,
  },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  // سلسلة افتراضية للاستعلامات
  mockSelect.mockReturnValue({ order: mockOrder, count: 'exact' });
  mockOrder.mockReturnValue({ range: mockRange, eq: mockEq, limit: mockLimit });
  mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
  mockEq.mockReturnValue({ order: mockOrder, range: mockRange, limit: mockLimit });
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockIn.mockReturnValue({ order: mockOrder });
  mockGte.mockReturnValue({ order: mockOrder });
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
  mockSingle.mockResolvedValue({ data: { id: 'new-ticket' }, error: null });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockRpc.mockReturnValue({ then: vi.fn() });
});

describe('useSupportTickets', () => {
  it('يجلب التذاكر بنجاح', async () => {
    mockRange.mockResolvedValue({
      data: [{ id: 't1', title: 'Test', status: 'open' }],
      error: null,
      count: 1,
    });

    const { useSupportTickets } = await import('./useSupportTickets');
    const { result } = renderHook(() => useSupportTickets(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.tickets).toHaveLength(1);
    expect(result.current.data?.totalCount).toBe(1);
  });

  it('يحسب pagination صحيح (page 2)', async () => {
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 });

    const { useSupportTickets } = await import('./useSupportTickets');
    renderHook(() => useSupportTickets(undefined, 2, 20), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockRange).toHaveBeenCalledWith(20, 39);
    });
  });
});

describe('useTicketReplies', () => {
  it('لا يجلب بيانات بدون ticketId', async () => {
    const { useTicketReplies } = await import('./useSupportTickets');
    const { result } = renderHook(() => useTicketReplies(), { wrapper: createWrapper() });
    // enabled = false → لن يبدأ الجلب
    expect(result.current.isFetching).toBe(false);
  });
});

describe('useCreateTicket', () => {
  it('يصدّر دالة mutate', async () => {
    const { useCreateTicket } = await import('./useSupportTickets');
    const { result } = renderHook(() => useCreateTicket(), { wrapper: createWrapper() });
    expect(typeof result.current.mutate).toBe('function');
  });
});

describe('useUpdateTicketStatus', () => {
  it('يصدّر دالة mutateAsync', async () => {
    const { useUpdateTicketStatus } = await import('./useSupportTickets');
    const { result } = renderHook(() => useUpdateTicketStatus(), { wrapper: createWrapper() });
    expect(typeof result.current.mutateAsync).toBe('function');
  });
});

describe('useRateTicket', () => {
  it('يرندر بدون خطأ', async () => {
    const { useRateTicket } = await import('./useSupportTickets');
    const { result } = renderHook(() => useRateTicket(), { wrapper: createWrapper() });
    expect(result.current).not.toBeNull();
  });
});

describe('useClientErrors', () => {
  it('يصدّر hook يعمل بدون خطأ', async () => {
    const { useClientErrors } = await import('./useSupportTickets');
    const { result } = renderHook(() => useClientErrors(), { wrapper: createWrapper() });
    expect(result.current).not.toBeNull();
    expect(typeof result.current.refetch).toBe('function');
  });
});
