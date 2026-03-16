import { describe, it, expect, vi } from 'vitest';

const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: 'u1', unit_number: '101' }], error: null });
const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, order: mockOrder });
const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
      delete: mockDelete,
      insert: mockInsert,
      update: mockUpdate,
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ enabled }: { queryFn: () => Promise<unknown>; enabled?: boolean }) => {
    if (enabled === false) return { data: undefined, isLoading: false };
    return { data: [], isLoading: false };
  },
  useMutation: ({ mutationFn, onSuccess, onError }: Record<string, Function>) => ({
    mutateAsync: async (...args: unknown[]) => {
      try {
        const r = await mutationFn(...args);
        onSuccess?.(r);
        return r;
      } catch (e) {
        onError?.(e);
        throw e;
      }
    },
    mutate: (...args: unknown[]) => mutationFn(...args).then(onSuccess).catch(onError),
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { useUnits, useDeleteUnit } from './useUnits';

describe('useUnits', () => {
  it('returns empty when no propertyId', () => {
    const result = useUnits();
    expect(result.data).toBeUndefined();
  });

  it('returns data when propertyId provided', () => {
    const result = useUnits('prop-1');
    expect(result).toBeDefined();
  });
});

describe('useDeleteUnit', () => {
  it('returns mutate function', () => {
    const { mutateAsync } = useDeleteUnit();
    expect(mutateAsync).toBeDefined();
  });
});
