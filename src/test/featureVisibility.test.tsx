/**
 * اختبارات سجل featureVisibilityRegistry و useFeatureVisibility.
 * يتحقق من: المفاتيح المتوقعة موجودة، lockable يفرض visible حتى لو حُفظ hidden،
 * الافتراضي visible عند غياب التخزين.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  FEATURE_VISIBILITY_REGISTRY,
  FEATURE_REGISTRY_BY_SCOPE,
  featureVisibilityKey,
} from '@/constants/featureVisibilityRegistry';

let mockSettings: Record<string, string> = {};

vi.mock('@/hooks/data/settings/app/useAppSettings', () => ({
  useAppSettings: () => ({ data: mockSettings, isLoading: false }),
}));

import { useFeatureVisibility } from '@/hooks/data/settings/permissions/useFeatureVisibility';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('FEATURE_VISIBILITY_REGISTRY', () => {
  it('يحتوي على مفاتيح المستفيد/الواقف/المحاسب', () => {
    expect(FEATURE_REGISTRY_BY_SCOPE.beneficiary.length).toBeGreaterThan(0);
    expect(FEATURE_REGISTRY_BY_SCOPE.waqif.length).toBeGreaterThan(0);
    expect(FEATURE_REGISTRY_BY_SCOPE.accountant.length).toBeGreaterThan(0);
  });

  it('الإفصاح السنوي مُعلَّم lockable', () => {
    const disclosure = FEATURE_VISIBILITY_REGISTRY.find(
      (e) => e.scope === 'beneficiary' && e.key === 'disclosure_notice',
    );
    expect(disclosure?.lockable).toBe(true);
  });

  it('featureVisibilityKey يلتزم بالصيغة feature_visibility.<scope>.<key>', () => {
    expect(featureVisibilityKey('beneficiary', 'advance_request'))
      .toBe('feature_visibility.beneficiary.advance_request');
  });
});

describe('useFeatureVisibility', () => {
  beforeEach(() => { mockSettings = {}; });

  it('الافتراضي visible عند غياب التخزين', () => {
    const { result } = renderHook(() => useFeatureVisibility(), { wrapper });
    expect(result.current.isVisible('beneficiary', 'share_summary')).toBe(true);
  });

  it('hidden محفوظ يُحترم لعنصر غير lockable', () => {
    mockSettings = { 'feature_visibility.beneficiary.share_summary': 'hidden' };
    const { result } = renderHook(() => useFeatureVisibility(), { wrapper });
    expect(result.current.isVisible('beneficiary', 'share_summary')).toBe(false);
  });

  it('hidden محفوظ يُتجاهَل لعنصر lockable (الإفصاح يبقى ظاهراً)', () => {
    mockSettings = { 'feature_visibility.beneficiary.disclosure_notice': 'hidden' };
    const { result } = renderHook(() => useFeatureVisibility(), { wrapper });
    expect(result.current.isVisible('beneficiary', 'disclosure_notice')).toBe(true);
  });
});
