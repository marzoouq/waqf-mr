/**
 * هوك فحص صلاحية الوصول لمسار معين حسب الدور والإعدادات
 */
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import {
  ADMIN_ROUTE_PERM_KEYS,
  BENEFICIARY_ROUTE_PERM_KEYS,
  ACCOUNTANT_EXCLUDED_ROUTES,
  defaultAdminSections,
  defaultBeneficiarySections,
  ADMIN_ROUTE_TO_SECTION,
  BENEFICIARY_ROUTE_TO_SECTION,
} from '@/constants/navigation';
import { DEFAULT_ROLE_PERMS } from '@/constants/rolePermissions';

export function usePermissionCheck() {
  const { role } = useAuth();
  const { getJsonSetting } = useAppSettings();

  const rolePermissions = getJsonSetting('role_permissions', DEFAULT_ROLE_PERMS);
  const sectionsVisibility: Record<string, boolean> = { ...defaultAdminSections, ...getJsonSetting<Record<string, boolean>>('sections_visibility', {}) };
  const beneficiarySections: Record<string, boolean> = { ...defaultBeneficiarySections, ...getJsonSetting<Record<string, boolean>>('beneficiary_sections', {}) };

  const isRouteAllowed = (path: string): boolean => {
    // الناظر يرى كل شيء
    if (role === 'admin') return true;

    // المحاسب
    if (role === 'accountant') {
      if (ACCOUNTANT_EXCLUDED_ROUTES.includes(path)) return false;
      const sectionKey = ADMIN_ROUTE_TO_SECTION[path];
      if (sectionKey && sectionsVisibility[sectionKey] === false) return false;
      const permKey = ADMIN_ROUTE_PERM_KEYS[path];
      if (permKey) {
        const perms = rolePermissions.accountant || DEFAULT_ROLE_PERMS.accountant;
        if (perms?.[permKey] === false) return false;
      }
      return true;
    }

    // المستفيد والواقف
    if (role === 'beneficiary' || role === 'waqif') {
      const bsKey = BENEFICIARY_ROUTE_TO_SECTION[path];
      if (bsKey && beneficiarySections[bsKey] === false) return false;
      const permKey = BENEFICIARY_ROUTE_PERM_KEYS[path];
      if (permKey) {
        const roleKey = role === 'waqif' ? 'waqif' : 'beneficiary';
        const perms = rolePermissions[roleKey] || DEFAULT_ROLE_PERMS[roleKey] || {};
        if (perms[permKey] === false) return false;
      }
      return true;
    }

    return true;
  };

  return { isRouteAllowed };
}
