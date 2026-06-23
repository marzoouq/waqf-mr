/**
 * اختبارات useSupportStats / useSupportAnalytics / fetchTicketsForExport
 * يغطي happy path + فشل Zod + فشل supabase.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ----- Mocks (يجب أن تُعرَّف قبل import الـ hook) -----
const rpcMock = vi.fn();
vi.mock('@/lib/api/rpc', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/rpc')>('@/lib/api/rpc');
  return { ...actual, rpc: (...args: unknown[]) => rpcMock(...args) };
});

const supabaseChainMock = {
  result: { data: [] as unknown[], error: null as null | { message: string } },
};
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve(supabaseChainMock.result),
        }),
      }),
    }),
  },
}));

import {
  useSupportStats,
  useSupportAnalytics,
  fetchTicketsForExport,
} from './useSupportAnalytics';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useSupportStats', () => {
  beforeEach(() => rpcMock.mockReset());

  it('يُرجع كائن الإحصائيات من RPC', async () => {
    const payload = {
      totalTickets: 10,
      openTickets: 3,
      inProgressTickets: 2,
      resolvedTickets: 5,
      highPriorityTickets: 1,
      ticketsLast7d: 4,
      totalErrors: 7,
      errorsLast24h: 2,
      errorsLast7d: 5,
    };
    rpcMock.mockResolvedValueOnce(payload);

    const { result } = renderHook(() => useSupportStats(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(rpcMock).toHaveBeenCalled();
    expect(rpcMock.mock.calls[0]?.[0]).toBe('get_support_stats');
    expect(result.current.data?.totalTickets).toBe(10);
    expect(result.current.data?.errorsLast24h).toBe(2);
  });
});

describe('useSupportAnalytics', () => {
  beforeEach(() => rpcMock.mockReset());

  it('happy path — يُمرّر البيانات الصحيحة عبر Zod', async () => {
    rpcMock.mockResolvedValueOnce({
      category_stats: [{ key: 'bug', count: 3 }],
      priority_stats: [{ key: 'high', count: 1 }],
      avg_resolution_hours: 12,
      avg_rating: 4.5,
      rated_count: 2,
      total_count: 5,
    });

    const { result } = renderHook(() => useSupportAnalytics(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.category_stats).toEqual([{ key: 'bug', count: 3 }]);
    expect(result.current.data?.avg_rating).toBe(4.5);
  });

  it('فشل Zod — ينتقل إلى isError عند بيانات بأنواع خاطئة', async () => {
    // count كنص بدلاً من رقم → Zod يفشل
    rpcMock.mockResolvedValueOnce({
      category_stats: [{ key: 'bug', count: 'three' }],
      priority_stats: [],
      avg_resolution_hours: 0,
      avg_rating: 0,
      rated_count: 0,
      total_count: 0,
    });

    const { result } = renderHook(() => useSupportAnalytics(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe('fetchTicketsForExport', () => {
  beforeEach(() => {
    supabaseChainMock.result = { data: [], error: null };
  });

  it('يُرجع المصفوفة عند النجاح', async () => {
    const rows = [{ ticket_number: 'TKT-1', title: 't', status: 'open' }];
    supabaseChainMock.result = { data: rows, error: null };
    const data = await fetchTicketsForExport();
    expect(data).toEqual(rows);
  });

  it('يُرجع [] عند data=null', async () => {
    supabaseChainMock.result = { data: null as unknown as [], error: null };
    const data = await fetchTicketsForExport();
    expect(data).toEqual([]);
  });

  it('يرمي عند وجود error', async () => {
    supabaseChainMock.result = { data: [], error: { message: 'boom' } };
    await expect(fetchTicketsForExport()).rejects.toMatchObject({ message: 'boom' });
  });
});
