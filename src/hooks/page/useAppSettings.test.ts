import { describe, it, expect, vi } from 'vitest';

const mockSelect = vi.fn().mockResolvedValue({
  data: [
    { key: 'waqf_name', value: 'وقف تجريبي' },
    { key: 'theme', value: '{"primary":"blue"}' },
  ],
  error: null,
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
      update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let storedData: Record<string, string> | undefined;

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn }: { queryFn: () => Promise<Record<string, string>> }) => {
    // Simulate fetched data
    if (!storedData) {
      queryFn().then(d => { storedData = d; });
    }
    return { data: storedData, isLoading: false };
  },
  useMutation: ({ mutationFn, onSuccess }: Record<string, Function>) => ({
    mutateAsync: async (...args: unknown[]) => {
      await mutationFn(...args);
      onSuccess?.();
    },
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { useAppSettings } from './useAppSettings';

describe('useAppSettings', () => {
  it('returns settings hook with getJsonSetting', () => {
    const { getJsonSetting } = useAppSettings();
    expect(getJsonSetting).toBeDefined();
  });

  it('getJsonSetting returns fallback when data is undefined', () => {
    storedData = undefined;
    const { getJsonSetting } = useAppSettings();
    expect(getJsonSetting('nonexistent', { x: 1 })).toEqual({ x: 1 });
  });

  it('getJsonSetting parses valid JSON', () => {
    storedData = { theme: '{"primary":"blue"}' };
    const { getJsonSetting } = useAppSettings();
    expect(getJsonSetting('theme', {})).toEqual({ primary: 'blue' });
  });

  it('getJsonSetting returns fallback on invalid JSON', () => {
    storedData = { theme: 'not-json' };
    const { getJsonSetting } = useAppSettings();
    expect(getJsonSetting('theme', { fallback: true })).toEqual({ fallback: true });
  });
});
