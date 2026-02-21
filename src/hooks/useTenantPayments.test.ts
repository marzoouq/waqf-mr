import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockSelect = vi.fn();
const mockUpsert = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      upsert: mockUpsert,
    })),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useTenantPayments, useUpsertTenantPayment } from './useTenantPayments';
import { toast } from 'sonner';

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
  mockSelect.mockResolvedValue({ data: samplePayments, error: null });
  mockUpsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
  mockSingle.mockResolvedValue({ data: samplePayments[0], error: null });
});

describe('useTenantPayments', () => {
  it('fetches all tenant payments', async () => {
    const { result } = renderHook(() => useTenantPayments(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(samplePayments);
  });

  it('handles fetch error', async () => {
    mockSelect.mockResolvedValueOnce({ data: null, error: { message: 'network error' } });
    const { result } = renderHook(() => useTenantPayments(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns empty array when no payments exist', async () => {
    mockSelect.mockResolvedValueOnce({ data: [], error: null });
    const { result } = renderHook(() => useTenantPayments(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useUpsertTenantPayment', () => {
  it('upserts payment and shows success toast', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 8 });
    expect(toast.success).toHaveBeenCalledWith('تم حفظ بيانات التحصيل');
  });

  it('passes notes as null when not provided', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 3 });
    expect(mockUpsert).toHaveBeenCalledWith(
      { contract_id: 'c-1', paid_months: 3, notes: null },
      { onConflict: 'contract_id' },
    );
  });

  it('passes notes when provided', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 12, notes: 'مسدد' });
    expect(mockUpsert).toHaveBeenCalledWith(
      { contract_id: 'c-1', paid_months: 12, notes: 'مسدد' },
      { onConflict: 'contract_id' },
    );
  });

  it('uses onConflict: contract_id for upsert', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 1 });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.any(Object),
      { onConflict: 'contract_id' },
    );
  });

  it('shows error toast on upsert failure', async () => {
    mockUpsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'rls denied' } }),
      }),
    });
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await expect(result.current.mutateAsync({ contract_id: 'c-1', paid_months: 5 })).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledWith('خطأ في حفظ بيانات التحصيل: rls denied');
  });

  it('handles zero paid_months', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 0 });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ paid_months: 0 }),
      expect.any(Object),
    );
    expect(toast.success).toHaveBeenCalled();
  });
});
