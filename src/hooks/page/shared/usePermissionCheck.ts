/**
 * هوك فحص صلاحية الوصول لمسار معين حسب الدور والإعدادات
 */
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useSectionsVisibility } from '@/hooks/data/settings/useSectionsVisibility';
import { useRolePermissions } from '@/hooks/data/settings/useRolePermissions';
import {
  ADMIN_ROUTE_PERM_KEYS,
  BENEFICIARY_ROUTE_PERM_KEYS,
  ACCOUNTANT_EXCLUDED_ROUTES,
  ADMIN_ROUTE_TO_SECTION,
  BENEFICIARY_ROUTE_TO_SECTION,
} from '@/constants/navigation';

export function usePermissionCheck() {
  const { role } = useAuth();
  const { adminSections: sectionsVisibility, beneficiarySections } = useSectionsVisibility();
  const { getPermissionsForRole } = useRolePermissions();

  const isRouteAllowed = (path: string): boolean => {
    if (role === 'admin') return true;

    if (role === 'accountant') {
      if (ACCOUNTANT_EXCLUDED_ROUTES.includes(path)) return false;
      const sectionKey = ADMIN_ROUTE_TO_SECTION[path];
      if (sectionKey && sectionsVisibility[sectionKey] === false) return false;
      const permKey = ADMIN_ROUTE_PERM_KEYS[path];
      if (permKey) {
        const perms = getPermissionsForRole('accountant');
        if (perms?.[permKey] === false) return false;
      }
      return true;
    }

    if (role === 'beneficiary' || role === 'waqif') {
      const bsKey = BENEFICIARY_ROUTE_TO_SECTION[path];
      if (bsKey && beneficiarySections[bsKey] === false) return false;
      const permKey = BENEFICIARY_ROUTE_PERM_KEYS[path];
      if (permKey) {
        const roleKey = role === 'waqif' ? 'waqif' : 'beneficiary';
        const perms = getPermissionsForRole(roleKey);
        if (perms[permKey] === false) return false;
      }
      return true;
    }

    return true;
  };

  return { isRouteAllowed };
}
