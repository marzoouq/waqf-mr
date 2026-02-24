import { describe, it, expect, vi } from 'vitest';

vi.mock('./useAppSettings', () => ({
  useAppSettings: vi.fn(),
}));

import { useAppSettings } from './useAppSettings';
import { useWaqfInfo } from './useWaqfInfo';

const mockedUseAppSettings = vi.mocked(useAppSettings);

describe('useWaqfInfo', () => {
  it('returns waqf info from app settings', () => {
    mockedUseAppSettings.mockReturnValue({
      data: {
        waqf_name: 'وقف الاختبار',
        waqf_founder: 'مؤسس',
        waqf_admin: 'ناظر',
      },
      isLoading: false,
      error: null,
    } as any);

    const result = useWaqfInfo();
    expect(result.data.waqf_name).toBe('وقف الاختبار');
    expect(result.data.waqf_founder).toBe('مؤسس');
    expect(result.data.waqf_admin).toBe('ناظر');
    expect(result.data.waqf_deed_number).toBe('');
    expect(result.isLoading).toBe(false);
  });

  it('returns loading state', () => {
    mockedUseAppSettings.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    const result = useWaqfInfo();
    expect(result.isLoading).toBe(true);
    expect(result.data.waqf_name).toBe('');
  });

  it('returns empty strings when settings is undefined', () => {
    mockedUseAppSettings.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);

    const result = useWaqfInfo();
    expect(result.data.waqf_name).toBe('');
    expect(result.data.waqf_founder).toBe('');
  });

  it('passes through error', () => {
    const err = new Error('fail');
    mockedUseAppSettings.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: err,
    } as any);

    const result = useWaqfInfo();
    expect(result.error).toBe(err);
  });
});
