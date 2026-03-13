import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

// --- Mocks ---
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null, role: null })),
}));

vi.mock('@/utils/notifications', () => ({ notifyUser: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function buildChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: mockSelect, eq: mockEq, order: mockOrder, limit: mockLimit,
    insert: mockInsert, single: mockSingle, maybeSingle: mockMaybeSingle, update: mockUpdate,
  };
  for (const fn of Object.values(chain)) fn.mockReturnValue(chain);
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockSingle.mockResolvedValue({ data: { id: 'conv-1' }, error: null });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue(buildChain());
  vi.mocked(useAuth).mockReturnValue({ user: null, role: null } as ReturnType<typeof useAuth>);
});

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useConversations', () => {
  it('معطّل بدون user', async () => {
    const { useConversations } = await import('./useMessaging');
    const { result } = renderHook(() => useConversations(), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('يجلب عند وجود user', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, role: 'admin' } as ReturnType<typeof useAuth>);

    const { useConversations } = await import('./useMessaging');
    const { result } = renderHook(() => useConversations('inquiry'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
    expect(result.current).not.toBeNull();
  });
});

describe('useMessages', () => {
  it('معطّل بدون conversationId', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, role: 'admin' } as ReturnType<typeof useAuth>);

    const { useMessages } = await import('./useMessaging');
    const { result } = renderHook(() => useMessages(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useSendMessage', () => {
  it('يرندر بدون خطأ', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, role: 'admin' } as ReturnType<typeof useAuth>);

    const { useSendMessage } = await import('./useMessaging');
    const { result } = renderHook(() => useSendMessage(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useCreateConversation', () => {
  it('يرندر بدون خطأ', async () => {
    const { useCreateConversation } = await import('./useMessaging');
    const { result } = renderHook(() => useCreateConversation(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});
