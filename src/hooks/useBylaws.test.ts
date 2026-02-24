import { describe, it, expect, vi } from 'vitest';

const mockLimit = vi.fn().mockResolvedValue({
  data: [{ id: 'b1', part_number: 1, part_title: 'الباب الأول', content: 'نص', sort_order: 1, is_visible: true }],
  error: null,
});
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
      update: () => ({ eq: mockUpdateEq }),
      delete: () => ({ eq: mockDeleteEq }),
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let capturedQueryFn: (() => Promise<unknown>) | null = null;

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn }: { queryFn: () => Promise<unknown> }) => {
    capturedQueryFn = queryFn;
    return { data: [], isLoading: false };
  },
  useMutation: ({ mutationFn, onSuccess, onError }: Record<string, Function>) => ({
    mutateAsync: async (...args: unknown[]) => {
      try {
        await mutationFn(...args);
        onSuccess?.();
      } catch (e) {
        onError?.(e);
        throw e;
      }
    },
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { useBylaws } from './useBylaws';

describe('useBylaws', () => {
  it('returns query and mutation functions', () => {
    const result = useBylaws();
    expect(result.updateBylaw).toBeDefined();
    expect(result.createBylaw).toBeDefined();
    expect(result.deleteBylaw).toBeDefined();
    expect(result.reorderBylaws).toBeDefined();
  });

  it('queryFn fetches bylaws data', async () => {
    useBylaws();
    const data = await capturedQueryFn!();
    expect(data).toHaveLength(1);
  });

  it('queryFn returns empty array on empty data', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: null });
    useBylaws();
    const data = await capturedQueryFn!();
    expect(data).toEqual([]);
  });

  it('queryFn throws on error', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });
    useBylaws();
    await expect(capturedQueryFn!()).rejects.toBeDefined();
  });
});
