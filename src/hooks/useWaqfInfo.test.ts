import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [] as any[],
        error: null,
      })),
    })),
  },
}));

import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('useWaqfInfo', () => {
  it('returns waqf info from app settings', async () => {
    const mockData = [
      { key: 'waqf_name', value: 'وقف الاختبار' },
      { key: 'waqf_founder', value: 'مؤسس' },
      { key: 'waqf_admin', value: 'ناظر' },
    ];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({ data: mockData, error: null })),
    } as any);

    const { useWaqfInfo } = await import('./useAppSettings');
    const { result } = renderHook(() => useWaqfInfo(), { wrapper: createWrapper() });

    // Wait for query to settle
    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.waqf_name).toBe('وقف الاختبار');
    expect(result.current.data.waqf_founder).toBe('مؤسس');
    expect(result.current.data.waqf_admin).toBe('ناظر');
  });

  it('returns loading state initially', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => new Promise(() => {})), // never resolves
    } as any);

    const { useWaqfInfo } = await import('./useAppSettings');
    const { result } = renderHook(() => useWaqfInfo(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data.waqf_name).toBe('');
  });

  it('returns empty strings when settings is empty', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({ data: [], error: null })),
    } as any);

    const { useWaqfInfo } = await import('./useAppSettings');
    const { result } = renderHook(() => useWaqfInfo(), { wrapper: createWrapper() });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.waqf_name).toBe('');
    expect(result.current.data.waqf_founder).toBe('');
  });

  it('passes through error', async () => {
    const err = new Error('fail');
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({ data: null, error: err })),
    } as any);

    const { useWaqfInfo } = await import('./useAppSettings');
    const { result } = renderHook(() => useWaqfInfo(), { wrapper: createWrapper() });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
