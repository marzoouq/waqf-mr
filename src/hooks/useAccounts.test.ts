import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from './useAccounts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const wrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

const sampleAccount = {
  id: 'acc-1',
  fiscal_year: '1446-1447',
  total_income: 200000,
  total_expenses: 30000,
  net_after_expenses: 170000,
  net_after_vat: 160000,
  vat_amount: 10000,
  zakat_amount: 5000,
  admin_share: 15500,
  waqif_share: 7750,
  waqf_revenue: 131750,
  waqf_capital: 0,
  waqf_corpus_previous: 0,
  waqf_corpus_manual: 0,
  distributions_amount: 0,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue({ order: mockOrder });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockLimit.mockResolvedValue({ data: [sampleAccount], error: null });
  mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
  mockSingle.mockResolvedValue({ data: sampleAccount, error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
  mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
});

describe('useAccounts (CRUD)', () => {
  it('queries accounts table with correct config', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('accounts');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data).toEqual([sampleAccount]);
  });

  it('creates account with Arabic success toast', async () => {
    const { result } = renderHook(() => useCreateAccount(), { wrapper: wrapper() });
    await result.current.mutateAsync({
      fiscal_year: '1447-1448',
      total_income: 100000,
    } as any);
    expect(toast.success).toHaveBeenCalledWith('تم إضافة الحساب بنجاح');
  });

  it('updates account and shows success toast', async () => {
    const { result } = renderHook(() => useUpdateAccount(), { wrapper: wrapper() });
    await result.current.mutateAsync({ id: 'acc-1', total_income: 250000 } as any);
    expect(toast.success).toHaveBeenCalledWith('تم تحديث الحساب بنجاح');
  });

  it('deletes account and shows success toast', async () => {
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: wrapper() });
    await result.current.mutateAsync('acc-1');
    expect(toast.success).toHaveBeenCalledWith('تم حذف الحساب بنجاح');
  });

  it('shows error toast on create failure', async () => {
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'duplicate' } }),
      }),
    });
    const { result } = renderHook(() => useCreateAccount(), { wrapper: wrapper() });
    await expect(result.current.mutateAsync({ fiscal_year: '1446-1447' } as any)).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledWith('حدث خطأ أثناء إضافة الحساب');
  });

  it('shows error toast on delete failure', async () => {
    mockDelete.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: 'rls denied' } }),
    });
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: wrapper() });
    await expect(result.current.mutateAsync('acc-1')).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledWith('حدث خطأ أثناء حذف الحساب');
  });

  it('handles empty accounts list', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });
    const { result } = renderHook(() => useAccounts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
