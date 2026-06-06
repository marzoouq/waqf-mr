/**
 * اختبارات سلوك Optimistic + Rollback + Toast لـ useNotificationActions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Notification } from '@/types';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// نموذج Supabase: نتحكم بنجاح/فشل update/delete
const updateMockState = { shouldFail: false };
const deleteMockState = { shouldFail: false };

vi.mock('@/integrations/supabase/client', () => {
  const buildChain = (failState: { shouldFail: boolean }) => {
    const final = () =>
      Promise.resolve({ error: failState.shouldFail ? { message: 'fail' } : null });
    const chain: Record<string, unknown> = {};
    chain.eq = vi.fn(() => chain);
    chain.not = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => unknown) => final().then(resolve);
    return chain;
  };
  return {
    supabase: {
      from: vi.fn(() => ({
        update: vi.fn(() => buildChain(updateMockState)),
        delete: vi.fn(() => buildChain(deleteMockState)),
      })),
    },
  };
});

vi.mock('@/hooks/ui/useNotificationSounds', () => ({
  useNotificationSounds: () => ({ playSound: vi.fn(), showBrowserNotification: vi.fn() }),
}));

vi.mock('@/lib/realtime/bfcacheSafeChannel', () => ({
  useBfcacheSafeChannel: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { useNotificationActions } from './useNotificationActions';

const USER_ID = 'user-1';

const seedNotifications = (qc: QueryClient): Notification[] => {
  const data: Notification[] = [
    { id: 'n1', user_id: USER_ID, title: 't1', message: 'm1', type: 'info', is_read: false, link: null, created_at: '2026-01-01T00:00:00Z' },
    { id: 'n2', user_id: USER_ID, title: 't2', message: 'm2', type: 'warning', is_read: false, link: null, created_at: '2026-01-02T00:00:00Z' },
    { id: 'n3', user_id: USER_ID, title: 't3', message: 'm3', type: 'info', is_read: true, link: null, created_at: '2026-01-03T00:00:00Z' },
  ];
  qc.setQueryData<InfiniteData<Notification[]>>(['notifications', USER_ID], {
    pages: [data],
    pageParams: [undefined],
  });
  return data;
};

const setup = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  seedNotifications(qc);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  const { result } = renderHook(
    () => useNotificationActions(USER_ID, true, new Set()),
    { wrapper }
  );
  return { qc, result };
};

const getList = (qc: QueryClient): Notification[] => {
  const d = qc.getQueryData<InfiniteData<Notification[]>>(['notifications', USER_ID]);
  return d?.pages[0] ?? [];
};

beforeEach(() => {
  updateMockState.shouldFail = false;
  deleteMockState.shouldFail = false;
  vi.clearAllMocks();
});

describe('useNotificationActions — optimistic mark as read', () => {
  it('markAsRead يحدّث الـ cache فوراً قبل تأكيد الشبكة', async () => {
    const { qc, result } = setup();
    act(() => { result.current.markAsRead.mutate('n1'); });
    // فحص فوري بعد onMutate
    await waitFor(() => {
      const n1 = getList(qc).find(n => n.id === 'n1');
      expect(n1?.is_read).toBe(true);
    });
  });

  it('markAllAsRead يحوّل كل العناصر إلى is_read=true في الـ cache فوراً', async () => {
    const { qc, result } = setup();
    act(() => { result.current.markAllAsRead.mutate(); });
    await waitFor(() => {
      const all = getList(qc);
      expect(all.every(n => n.is_read)).toBe(true);
    });
  });

  it('عند فشل markAllAsRead يُستعاد snapshot ويظهر toast.error', async () => {
    updateMockState.shouldFail = true;
    const { qc, result } = setup();
    act(() => { result.current.markAllAsRead.mutate(); });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('تعذّر تحديث حالة الإشعارات', undefined);
    });
    const all = getList(qc);
    // unread استُعيدا (n1, n2)
    expect(all.filter(n => !n.is_read).map(n => n.id).sort()).toEqual(['n1', 'n2']);
  });

  it('deleteOne يحذف العنصر فوراً من الـ cache', async () => {
    const { qc, result } = setup();
    act(() => { result.current.deleteOne.mutate('n2'); });
    await waitFor(() => {
      expect(getList(qc).find(n => n.id === 'n2')).toBeUndefined();
    });
  });

  it('عند فشل deleteOne يُستعاد العنصر ويظهر toast.error', async () => {
    deleteMockState.shouldFail = true;
    const { qc, result } = setup();
    act(() => { result.current.deleteOne.mutate('n2'); });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('تعذّر حذف الإشعار', undefined);
    });
    expect(getList(qc).find(n => n.id === 'n2')).toBeDefined();
  });

  it('deleteRead يحذف الإشعارات المقروءة فوراً من الـ cache', async () => {
    const { qc, result } = setup();
    act(() => { result.current.deleteRead.mutate(); });
    await waitFor(() => {
      expect(getList(qc).some(n => n.is_read)).toBe(false);
    });
  });
});
