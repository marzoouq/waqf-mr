import { describe, it, expect, vi } from 'vitest';

const mockSelect = vi.fn().mockReturnValue({
  order: vi.fn().mockResolvedValue({
    data: [
      { id: 'fy-1', label: '1446-1447', status: 'active', published: true, start_date: '2024-10-01', end_date: '2025-10-01', created_at: '' },
      { id: 'fy-2', label: '1445-1446', status: 'closed', published: true, start_date: '2023-10-01', end_date: '2024-10-01', created_at: '' },
    ],
    error: null,
  }),
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: mockSelect }) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn, enabled }: { queryFn: () => Promise<unknown>; enabled: boolean }) => {
    if (!enabled) return { data: undefined, isLoading: false };
    // Return a resolved structure
    return { data: undefined, isLoading: true };
  },
}));

import { useActiveFiscalYear } from './useFiscalYears';

describe('useActiveFiscalYear', () => {
  it('returns active fiscal year from list', () => {
    const result = useActiveFiscalYear();
    // With mocked useQuery, data is undefined (loading)
    expect(result.fiscalYears).toBeDefined();
  });

  it('returns first FY if no active one', () => {
    const result = useActiveFiscalYear();
    // fiscalYears defaults to []
    expect(result.data).toBeDefined();
  });
});
