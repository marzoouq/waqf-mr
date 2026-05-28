/**
 * اختبارات وحدة لـ useSectionsVisibility
 * يتحقق من: دمج defaults، الكتابة فوق defaults بإعدادات المستخدم، استقرار المرجع.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSectionsVisibility } from './useSectionsVisibility';
import { defaultAdminSections, defaultBeneficiarySections } from '@/constants/navigation';

const getJsonSettingMock = vi.fn();

vi.mock('./useAppSettings', () => ({
  useAppSettings: () => ({ getJsonSetting: getJsonSettingMock }),
}));

describe('useSectionsVisibility', () => {
  beforeEach(() => {
    getJsonSettingMock.mockReset();
  });

  it('returns defaults when no settings exist', () => {
    getJsonSettingMock.mockImplementation((_key: string, fallback: unknown) => fallback);
    const { result } = renderHook(() => useSectionsVisibility());
    expect(result.current.adminSections).toEqual(defaultAdminSections);
    expect(result.current.beneficiarySections).toEqual(defaultBeneficiarySections);
  });

  it('merges user overrides on top of defaults', () => {
    getJsonSettingMock.mockImplementation((key: string) => {
      if (key === 'sections_visibility') return { properties: false };
      if (key === 'beneficiary_sections') return { disclosure: false };
      return {};
    });
    const { result } = renderHook(() => useSectionsVisibility());
    expect(result.current.adminSections.properties).toBe(false);
    expect(result.current.beneficiarySections.disclosure).toBe(false);
    // defaults still merged
    expect(result.current.adminSections).toMatchObject({ ...defaultAdminSections, properties: false });
  });

  it('returns stable references between renders when getJsonSetting is stable', () => {
    getJsonSettingMock.mockImplementation((_key: string, fallback: unknown) => fallback);
    const { result, rerender } = renderHook(() => useSectionsVisibility());
    const first = result.current;
    rerender();
    expect(result.current.adminSections).toBe(first.adminSections);
    expect(result.current.beneficiarySections).toBe(first.beneficiarySections);
  });
});
