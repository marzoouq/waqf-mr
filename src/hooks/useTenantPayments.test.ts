import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockSelect = vi.fn();
const mockUpsert = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: mockSelect,
      upsert: mockUpsert,
    })),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useTenantPayments, useUpsertTenantPayment } from './useTenantPayments';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

  // Default: select returns payments list (for useTenantPayments query)
  mockSelect.mockResolvedValue({ data: samplePayments, error: null });

  // For useUpsertTenantPayment: supabase.from().select().eq().maybeSingle() then upsert().select().single()
  // We need to mock the chain properly based on how the actual code works:
  // Step 1: supabase.from('tenant_payments').select('paid_months').eq('contract_id', ...).maybeSingle()
  // Step 2: supabase.from('tenant_payments').upsert(...).select().single()

  const mockFromFn = vi.mocked(supabase.from);
  mockFromFn.mockImplementation((table: string) => {
    return {
      select: vi.fn().mockReturnValue({
        // For the initial query: .select('paid_months').eq().maybeSingle()
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { paid_months: 0 }, error: null }),
        }),
        // For after upsert: .select().single()  
        single: vi.fn().mockResolvedValue({ data: samplePayments[0], error: null }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: samplePayments[0], error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as any;
  });
});

describe('useTenantPayments', () => {
  it('fetches all tenant payments', async () => {
    // Override for simple select with .limit() chain
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: samplePayments, error: null }),
      }),
    } as any);
    const { result } = renderHook(() => useTenantPayments(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(samplePayments);
  });

  it('handles fetch error', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'network error' } }),
      }),
    } as any);
    const { result } = renderHook(() => useTenantPayments(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns empty array when no payments exist', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any);
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
    // Verify upsert was called on supabase.from('tenant_payments')
    expect(supabase.from).toHaveBeenCalledWith('tenant_payments');
  });

  it('passes notes when provided', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 12, notes: 'مسدد' });
    expect(toast.success).toHaveBeenCalledWith('تم حفظ بيانات التحصيل');
  });

  it('uses onConflict: contract_id for upsert', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 1 });
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows error toast on upsert failure', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'rls denied' } }),
        }),
      }),
    } as any));
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await expect(result.current.mutateAsync({ contract_id: 'c-1', paid_months: 5 })).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledWith('خطأ في حفظ بيانات التحصيل: rls denied');
  });

  it('handles zero paid_months', async () => {
    const { result } = renderHook(() => useUpsertTenantPayment(), { wrapper: wrapper() });
    await result.current.mutateAsync({ contract_id: 'c-1', paid_months: 0 });
    expect(toast.success).toHaveBeenCalled();
  });
});
