import { describe, it, expect, vi } from 'vitest';

const mockIn = vi.fn().mockResolvedValue({
  data: [
    { key: 'waqf_name', value: 'وقف الاختبار' },
    { key: 'waqf_founder', value: 'مؤسس' },
    { key: 'waqf_admin', value: 'ناظر' },
  ],
  error: null,
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ in: mockIn }) }),
  },
}));

let capturedQueryFn: (() => Promise<unknown>) | null = null;

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn }: { queryFn: () => Promise<unknown> }) => {
    capturedQueryFn = queryFn;
    return { data: undefined, isLoading: true };
  },
}));

import { useWaqfInfo } from './useWaqfInfo';

describe('useWaqfInfo', () => {
  it('returns a query hook', () => {
    const result = useWaqfInfo();
    expect(result).toBeDefined();
    expect(result.isLoading).toBe(true);
  });

  it('queryFn maps app_settings rows to WaqfInfo', async () => {
    useWaqfInfo();
    expect(capturedQueryFn).toBeDefined();
    const info = await capturedQueryFn!() as Record<string, string>;
    expect(info.waqf_name).toBe('وقف الاختبار');
    expect(info.waqf_founder).toBe('مؤسس');
    expect(info.waqf_admin).toBe('ناظر');
    expect(info.waqf_deed_number).toBe('');
  });

  it('queryFn handles empty data', async () => {
    mockIn.mockResolvedValueOnce({ data: [], error: null });
    useWaqfInfo();
    const info = await capturedQueryFn!() as Record<string, string>;
    expect(info.waqf_name).toBe('');
  });

  it('queryFn throws on error', async () => {
    mockIn.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });
    useWaqfInfo();
    await expect(capturedQueryFn!()).rejects.toBeDefined();
  });
});
