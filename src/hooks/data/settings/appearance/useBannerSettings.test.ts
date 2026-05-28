import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBannerSettings } from './useBannerSettings';
import { DEFAULT_BANNER_SETTINGS } from '@/constants';

let storedData: Record<string, string> = {};

vi.mock('./useAppSettings', () => ({
  useAppSettings: () => ({
    isLoading: false,
    getJsonSetting: <T,>(key: string, fallback: T) => {
      const raw = storedData[key];
      if (!raw) return fallback;
      try { return JSON.parse(raw) as T; } catch { return fallback; }
    },
    updateJsonSetting: vi.fn(async () => {}),
  }),
}));

describe('useBannerSettings', () => {
  beforeEach(() => { storedData = {}; });

  it('يُرجِع defaults عند غياب الإعداد', () => {
    const { result } = renderHook(() => useBannerSettings());
    expect(result.current.settings).toEqual(DEFAULT_BANNER_SETTINGS);
  });

  it('يدمج المُخزَّن فوق الـ defaults', () => {
    storedData.beta_banner_settings = JSON.stringify({ enabled: false, text: 'مخصَّص' });
    const { result } = renderHook(() => useBannerSettings());
    expect(result.current.settings.enabled).toBe(false);
    expect(result.current.settings.text).toBe('مخصَّص');
    expect(result.current.settings.color).toBe(DEFAULT_BANNER_SETTINGS.color);
  });

  it('يُرجِع نفس مرجع settings عبر إعادة renders متتالية', () => {
    storedData.beta_banner_settings = JSON.stringify({ enabled: true, text: 'ثابت' });
    const { result, rerender } = renderHook(() => useBannerSettings());
    const first = result.current.settings;
    rerender();
    expect(result.current.settings).toBe(first);
  });
});
