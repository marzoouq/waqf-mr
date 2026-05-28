import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBeneficiaryWidgets } from './useBeneficiaryWidgets';
import { BENEFICIARY_WIDGET_KEYS } from '@/constants/beneficiaryWidgets';

let storedData: Record<string, string> = {};

vi.mock('./useAppSettings', () => ({
  useAppSettings: () => ({
    isLoading: false,
    getJsonSetting: <T,>(key: string, fallback: T) => {
      const raw = storedData[key];
      if (!raw) return fallback;
      try { return JSON.parse(raw) as T; } catch { return fallback; }
    },
  }),
}));

describe('useBeneficiaryWidgets', () => {
  beforeEach(() => { storedData = {}; });

  it('كل العناصر مرئية افتراضياً', () => {
    const { result } = renderHook(() => useBeneficiaryWidgets());
    BENEFICIARY_WIDGET_KEYS.forEach(key => {
      expect(result.current.isVisible(key)).toBe(true);
    });
  });

  it('يحترم تخصيص الإخفاء من المُخزَّن', () => {
    storedData.beneficiary_widgets = JSON.stringify({ welcome_card: false, stats_row: true });
    const { result } = renderHook(() => useBeneficiaryWidgets());
    expect(result.current.isVisible('welcome_card')).toBe(false);
    expect(result.current.isVisible('stats_row')).toBe(true);
    // مفتاح غير موجود في المُخزَّن → يأخذ default = true
    expect(result.current.isVisible('quick_links')).toBe(true);
  });

  it('isVisible يُرجِع true لمفتاح غير معروف', () => {
    const { result } = renderHook(() => useBeneficiaryWidgets());
    expect(result.current.isVisible('unknown_widget')).toBe(true);
  });

  it('استقرار مرجع widgets عبر renders', () => {
    storedData.beneficiary_widgets = JSON.stringify({ welcome_card: true });
    const { result, rerender } = renderHook(() => useBeneficiaryWidgets());
    const first = result.current.widgets;
    rerender();
    expect(result.current.widgets).toBe(first);
  });
});
