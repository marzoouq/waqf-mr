/**
 * هوك مشترك لقراءة `role_permissions` من `app_settings` ودمجها فوق DEFAULT_ROLE_PERMS.
 *
 * يُستخدم في: usePermissionCheck, useNavLinks, RolePermissionsTab, PermissionsControlPanel
 * لإزالة التكرار وضمان مرجع ثابت بين renders (memoization).
 *
 * Public API:
 *   - rolePermissions: RolePerms (defaults مدموجة بالكامل)
 *   - getPermissionsForRole(roleKey): مساعدة آمنة تُرجع perms لدور معيّن مع fallback
 */
import { useMemo, useCallback } from 'react';
import { useAppSettings } from './useAppSettings';
import { DEFAULT_ROLE_PERMS, type RolePerms } from '@/constants/rolePermissions';

export function useRolePermissions() {
  const { getJsonSetting } = useAppSettings();

  const rolePermissions = useMemo<RolePerms>(() => {
    const saved = getJsonSetting<RolePerms>('role_permissions', {});
    const merged: RolePerms = {};
    const allKeys = new Set([...Object.keys(DEFAULT_ROLE_PERMS), ...Object.keys(saved || {})]);
    for (const key of allKeys) {
      merged[key] = { ...(DEFAULT_ROLE_PERMS[key] || {}), ...(saved?.[key] || {}) };
    }
    return merged;
  }, [getJsonSetting]);

  const getPermissionsForRole = useCallback(
    (roleKey: string): Record<string, boolean> => rolePermissions[roleKey] || DEFAULT_ROLE_PERMS[roleKey] || {},
    [rolePermissions],
  );

  return { rolePermissions, getPermissionsForRole };
}
