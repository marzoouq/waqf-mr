import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

const mockFiscalYears = [
  { id: 'fy-1', label: '1446-1447', status: 'active', published: true, start_date: '2024-10-01', end_date: '2025-10-01', created_at: '' },
  { id: 'fy-2', label: '1445-1446', status: 'closed', published: true, start_date: '2023-10-01', end_date: '2024-10-01', created_at: '' },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: mockFiscalYears, error: null }) }) }) }) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn, enabled }: { queryFn: () => Promise<unknown>; enabled: boolean }) => {
    if (!enabled) return { data: undefined, isLoading: false };
    return { data: mockFiscalYears, isLoading: false };
  },
}));

import { useActiveFiscalYear } from './useFiscalYears';

describe('useActiveFiscalYear', () => {
  it('returns active fiscal year from list', () => {
    const { result } = renderHook(() => useActiveFiscalYear());
    expect(result.current.fiscalYears).toEqual(mockFiscalYears);
    expect(result.current.data?.id).toBe('fy-1');
  });

  it('returns first FY if no active one', () => {
    const { result } = renderHook(() => useActiveFiscalYear());
    expect(result.current.data).toBeDefined();
  });
});
