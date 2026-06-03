/**
 * اختبار حماية لمنطق `defaultHidden`:
 * - المفاتيح المسجلة بـ `defaultHidden=true` يجب أن تُعاد كـ `hidden` عند غياب القيمة.
 * - تبديل القيمة في app_settings يجب أن يُعيد visible/hidden وفق ما حُفظ.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureVisibility } from './useFeatureVisibility';

vi.mock('@/hooks/data/settings/app/useAppSettings', () => ({
  useAppSettings: vi.fn(),
}));

import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';

describe('useFeatureVisibility — defaultHidden', () => {
  beforeEach(() => vi.resetAllMocks());

  it('treats defaultHidden entry as hidden when no value stored', () => {
    (useAppSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: {}, isLoading: false });
    const { result } = renderHook(() => useFeatureVisibility());
    expect(result.current.isVisible('accountant', 'financial_cards')).toBe(false);
  });

  it('respects explicit visible override', () => {
    (useAppSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { 'feature_visibility.accountant.financial_cards': 'visible' },
      isLoading: false,
    });
    const { result } = renderHook(() => useFeatureVisibility());
    expect(result.current.isVisible('accountant', 'financial_cards')).toBe(true);
  });

  it('defaults non-flagged entries to visible', () => {
    (useAppSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: {}, isLoading: false });
    const { result } = renderHook(() => useFeatureVisibility());
    expect(result.current.isVisible('accountant', 'overdue_invoices_widget')).toBe(true);
  });
});
