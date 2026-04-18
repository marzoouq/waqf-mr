import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppearanceSettings, DEFAULT_APPEARANCE_SETTINGS } from './useAppearanceSettings';

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

describe('useAppearanceSettings', () => {
  beforeEach(() => { storedData = {}; });

  it('يُرجِع defaults عند غياب الإعداد', () => {
    const { result } = renderHook(() => useAppearanceSettings());
    expect(result.current.settings).toEqual(DEFAULT_APPEARANCE_SETTINGS);
  });

  it('يقرأ system_name المُخزَّن', () => {
    storedData.appearance_settings = JSON.stringify({ system_name: 'وقف اختبار' });
    const { result } = renderHook(() => useAppearanceSettings());
    expect(result.current.settings.system_name).toBe('وقف اختبار');
  });

  it('استقرار المرجع عبر renders', () => {
    storedData.appearance_settings = JSON.stringify({ system_name: 'ثابت' });
    const { result, rerender } = renderHook(() => useAppearanceSettings());
    const first = result.current.settings;
    rerender();
    expect(result.current.settings).toBe(first);
  });
});
