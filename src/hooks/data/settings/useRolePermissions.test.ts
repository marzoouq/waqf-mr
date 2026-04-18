/**
 * اختبارات وحدة لـ useRolePermissions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRolePermissions } from './useRolePermissions';
import { DEFAULT_ROLE_PERMS } from '@/constants/rolePermissions';

const getJsonSettingMock = vi.fn();

vi.mock('./useAppSettings', () => ({
  useAppSettings: () => ({ getJsonSetting: getJsonSettingMock }),
}));

describe('useRolePermissions', () => {
  beforeEach(() => {
    getJsonSettingMock.mockReset();
  });

  it('returns DEFAULT_ROLE_PERMS when no saved settings', () => {
    getJsonSettingMock.mockImplementation((_k: string, fb: unknown) => fb);
    const { result } = renderHook(() => useRolePermissions());
    for (const role of Object.keys(DEFAULT_ROLE_PERMS)) {
      expect(result.current.rolePermissions[role]).toMatchObject(DEFAULT_ROLE_PERMS[role]);
    }
  });

  it('merges saved overrides on top of defaults', () => {
    getJsonSettingMock.mockImplementation(() => ({ accountant: { properties: false } }));
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.rolePermissions.accountant.properties).toBe(false);
    // defaults still merged for other keys
    expect(result.current.rolePermissions.accountant.contracts).toBe(DEFAULT_ROLE_PERMS.accountant.contracts);
  });

  it('getPermissionsForRole returns fallback for unknown role', () => {
    getJsonSettingMock.mockImplementation((_k: string, fb: unknown) => fb);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.getPermissionsForRole('nonexistent_role')).toEqual({});
    expect(result.current.getPermissionsForRole('accountant')).toMatchObject(DEFAULT_ROLE_PERMS.accountant);
  });

  it('returns stable reference between renders', () => {
    getJsonSettingMock.mockImplementation((_k: string, fb: unknown) => fb);
    const { result, rerender } = renderHook(() => useRolePermissions());
    const first = result.current.rolePermissions;
    rerender();
    expect(result.current.rolePermissions).toBe(first);
  });
});
