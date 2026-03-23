import { describe, it, expect, vi } from 'vitest';

const mockLimit = vi.fn().mockResolvedValue({
  data: [{ id: 'b1', part_number: 1, part_title: 'الباب الأول', content: 'نص', sort_order: 1, is_visible: true }],
  error: null,
});
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
      insert: () => ({ select: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'new' }, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: 'b1' }, error: null }) }) }) }),
      delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

let capturedQueryFn: (() => Promise<unknown>) | null = null;

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn }: { queryFn: () => Promise<unknown> }) => {
    capturedQueryFn = queryFn;
    return { data: [], isLoading: false };
  },
  useMutation: ({ mutationFn, onSuccess, onError }: Record<string, Function>) => ({
    mutate: async (...args: unknown[]) => {
      try {
        const result = await mutationFn(...args);
        onSuccess?.(result);
      } catch (e) {
        onError?.(e);
        throw e;
      }
    },
    mutateAsync: async (...args: unknown[]) => {
      try {
        const result = await mutationFn(...args);
        onSuccess?.(result);
        return result;
      } catch (e) {
        onError?.(e);
        throw e;
      }
    },
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { useBylaws, useCreateBylaw, useUpdateBylaw, useDeleteBylaw, useReorderBylaws } from './useBylaws';

describe('useBylaws (factory)', () => {
  it('useBylaws returns query result', () => {
    const result = useBylaws();
    expect(result.data).toBeDefined();
    expect(result.isLoading).toBe(false);
  });

  it('queryFn fetches bylaws data', async () => {
    useBylaws();
    const data = await capturedQueryFn!();
    expect(data).toHaveLength(1);
  });

  it('queryFn returns null on empty data (factory does not coerce)', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: null });
    useBylaws();
    const data = await capturedQueryFn!();
    expect(data).toBeNull();
  });

  it('queryFn throws on error', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });
    useBylaws();
    await expect(capturedQueryFn!()).rejects.toBeDefined();
  });

  it('separate hooks are exported', () => {
    expect(useCreateBylaw).toBeDefined();
    expect(useUpdateBylaw).toBeDefined();
    expect(useDeleteBylaw).toBeDefined();
    expect(useReorderBylaws).toBeDefined();
  });
});
