/**
 * هوك فلترة وبناء روابط القائمة الجانبية حسب الدور والصلاحيات
 * مُستخرج من DashboardLayout لفصل المسؤوليات
 *
 * تم تبسيطه عبر استخدام `utils/auth/filterByVisibility` كمصدر موحَّد
 * لقواعد الفلترة، تُشاركها BottomNav أيضاً.
 */
import { useMemo } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useSectionsVisibility } from '@/hooks/data/settings/useSectionsVisibility';
import { useRolePermissions } from '@/hooks/data/settings/useRolePermissions';
import { defaultMenuLabels, type MenuLabels } from '@/types/navigation';
import { linkLabelKeys, allAdminLinks, allBeneficiaryLinks, ADMIN_ROUTE_PERM_KEYS, BENEFICIARY_ROUTE_PERM_KEYS, ACCOUNTANT_EXCLUDED_ROUTES, ADMIN_ROUTE_TO_SECTION, BENEFICIARY_ROUTE_TO_SECTION } from '@/constants/navigation';
import { filterLinksBySectionVisibility, filterLinksByPermissions } from '@/utils/auth/filterByVisibility';

export function useNavLinks() {
  const { role } = useAuth();
  const { getJsonSetting } = useAppSettings();
  const { adminSections: sectionsVisibility, beneficiarySections } = useSectionsVisibility();
  const { getPermissionsForRole } = useRolePermissions();

  const menuLabels = getJsonSetting<MenuLabels>('menu_labels', defaultMenuLabels);

  const links = useMemo(() => {
    const applyLabels = <L extends { to: string; label: string }>(items: L[]): L[] =>
      items.map(link => {
        const labelKey = linkLabelKeys[link.to];
        return { ...link, label: (labelKey && menuLabels[labelKey]) || link.label };
      });

    if (role === 'admin') {
      const filtered = filterLinksBySectionVisibility(allAdminLinks, ADMIN_ROUTE_TO_SECTION, sectionsVisibility);
      return applyLabels(filtered);
    }

    if (role === 'accountant') {
      const perms = getPermissionsForRole('accountant');
      const withoutExcluded = allAdminLinks.filter(link => !ACCOUNTANT_EXCLUDED_ROUTES.includes(link.to));
      const bySection = filterLinksBySectionVisibility(withoutExcluded, ADMIN_ROUTE_TO_SECTION, sectionsVisibility);
      const byPerms = filterLinksByPermissions(bySection, ADMIN_ROUTE_PERM_KEYS, perms ?? {});
      return applyLabels(byPerms);
    }

    const roleKey = role === 'waqif' ? 'waqif' : 'beneficiary';
    const perms = getPermissionsForRole(roleKey);
    const remapped = allBeneficiaryLinks.map(link =>
      role === 'waqif' && link.to === '/beneficiary' ? { ...link, to: '/waqif' } : link,
    );
    const bySection = filterLinksBySectionVisibility(remapped, BENEFICIARY_ROUTE_TO_SECTION, beneficiarySections);
    return filterLinksByPermissions(bySection, BENEFICIARY_ROUTE_PERM_KEYS, perms);
  }, [role, getPermissionsForRole, menuLabels, sectionsVisibility, beneficiarySections]);

  return links;
}
