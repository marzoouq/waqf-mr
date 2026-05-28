/**
 * اختبار انحدار: useSectionsVisibility يحمي settings/users من الإخفاء
 * حتى لو حاول الإعداد في DB تعطيلهما.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSectionsVisibility } from '@/hooks/data/settings/permissions/useSectionsVisibility';

const getJsonSettingMock = vi.fn();

vi.mock('@/hooks/data/settings/app/useAppSettings', () => ({
  useAppSettings: () => ({ getJsonSetting: getJsonSettingMock }),
}));

describe('useSectionsVisibility - protected admin sections', () => {
  beforeEach(() => getJsonSettingMock.mockReset());

  it('يُجبر settings و users على true حتى لو رجعت DB بـ false', () => {
    getJsonSettingMock.mockImplementation((key: string) => {
      if (key === 'sections_visibility') {
        return { settings: false, users: false, properties: false };
      }
      return {};
    });
    const { result } = renderHook(() => useSectionsVisibility());
    expect(result.current.adminSections.settings).toBe(true);
    expect(result.current.adminSections.users).toBe(true);
    // غير المحميّة تُحترم كما هي
    expect(result.current.adminSections.properties).toBe(false);
  });

  it('لا يؤثر على beneficiarySections', () => {
    getJsonSettingMock.mockImplementation((key: string) => {
      if (key === 'beneficiary_sections') return { invoices: false };
      return {};
    });
    const { result } = renderHook(() => useSectionsVisibility());
    expect(result.current.beneficiarySections.invoices).toBe(false);
  });
});
