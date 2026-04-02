/**
 * هوك فلترة وبناء روابط القائمة الجانبية حسب الدور والصلاحيات
 * مُستخرج من DashboardLayout لفصل المسؤوليات
 */
import { useMemo } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import { defaultMenuLabels, type MenuLabels } from '@/types/menuLabels';
import { DEFAULT_ROLE_PERMS } from '@/constants/rolePermissions';
import {
  linkLabelKeys, allAdminLinks, allBeneficiaryLinks,
  ADMIN_ROUTE_PERM_KEYS, BENEFICIARY_ROUTE_PERM_KEYS,
  ACCOUNTANT_EXCLUDED_ROUTES,
  defaultAdminSections, defaultBeneficiarySections,
  ADMIN_SECTION_KEYS, BENEFICIARY_SECTION_KEYS,
} from '@/components/dashboard-layout/constants';

export function useNavLinks() {
  const { role } = useAuth();
  const { getJsonSetting } = useAppSettings();

  const menuLabels = getJsonSetting<MenuLabels>('menu_labels', defaultMenuLabels);
  const rolePermissions = getJsonSetting('role_permissions', DEFAULT_ROLE_PERMS);
  const sectionsVisibility = useMemo(
    () => ({ ...defaultAdminSections, ...getJsonSetting<Record<string, boolean>>('sections_visibility', {}) }),
    [getJsonSetting],
  );
  const beneficiarySections = useMemo(
    () => ({ ...defaultBeneficiarySections, ...getJsonSetting<Record<string, boolean>>('beneficiary_sections', {}) }),
    [getJsonSetting],
  );

  const links = useMemo(() => {
    if (role === 'admin') {
      return allAdminLinks
        .filter(link => {
          const sectionKey = ADMIN_SECTION_KEYS[link.to];
          return !sectionKey || (sectionsVisibility as Record<string, boolean>)[sectionKey] !== false;
        })
        .map(link => {
          const labelKey = linkLabelKeys[link.to];
          return { ...link, label: (labelKey && menuLabels[labelKey]) || link.label };
        });
    }

    if (role === 'accountant') {
      const perms = rolePermissions.accountant || DEFAULT_ROLE_PERMS.accountant;
      return allAdminLinks
        .filter(link => !ACCOUNTANT_EXCLUDED_ROUTES.includes(link.to))
        .filter(link => {
          const sectionKey = ADMIN_SECTION_KEYS[link.to];
          if (sectionKey && (sectionsVisibility as Record<string, boolean>)[sectionKey] === false) return false;
          const key = ADMIN_ROUTE_PERM_KEYS[link.to];
          return !key || perms?.[key] !== false;
        })
        .map(link => {
          const labelKey = linkLabelKeys[link.to];
          return { ...link, label: (labelKey && menuLabels[labelKey]) || link.label };
        });
    }

    const roleKey = role === 'waqif' ? 'waqif' : 'beneficiary';
    const perms = rolePermissions[roleKey] || DEFAULT_ROLE_PERMS[roleKey] || {};
    return allBeneficiaryLinks
      .map(link => {
        if (role === 'waqif' && link.to === '/beneficiary') {
          return { ...link, to: '/waqif' };
        }
        return link;
      })
      .filter(link => {
        const bsKey = BENEFICIARY_SECTION_KEYS[link.to];
        if (bsKey && (beneficiarySections as Record<string, boolean>)[bsKey] === false) return false;
        const key = BENEFICIARY_ROUTE_PERM_KEYS[link.to];
        return !key || perms[key] !== false;
      });
  }, [role, rolePermissions, menuLabels, sectionsVisibility, beneficiarySections]);

  return links;
}
