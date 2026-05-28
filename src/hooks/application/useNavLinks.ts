/**
 * هوك فلترة وبناء روابط القائمة الجانبية حسب الدور والصلاحيات
 *
 * يُرجع الآن قائمة مسطّحة (للتوافق العكسي مع BottomNav والـtests)
 * إضافةً لقائمة مجمَّعة حسب الأقسام (Sidebar groups — PR-1).
 */
import { useMemo } from 'react';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { useSectionsVisibility } from '@/hooks/data/settings/permissions/useSectionsVisibility';
import { useRolePermissions } from '@/hooks/data/settings/permissions/useRolePermissions';
import { defaultMenuLabels, type MenuLabels } from '@/types/navigation';
import {
  linkLabelKeys,
  allAdminLinks,
  allBeneficiaryLinks,
  ADMIN_ROUTE_PERM_KEYS,
  BENEFICIARY_ROUTE_PERM_KEYS,
  ACCOUNTANT_EXCLUDED_ROUTES,
  ADMIN_ROUTE_TO_SECTION,
  BENEFICIARY_ROUTE_TO_SECTION,
  ADMIN_GROUP_ORDER,
  ADMIN_GROUP_LABELS,
  ADMIN_ROUTE_GROUPS,
  BENEFICIARY_GROUP_ORDER,
  BENEFICIARY_GROUP_LABELS,
  BENEFICIARY_ROUTE_GROUPS,
} from '@/constants/navigation';
import { filterLinksBySectionVisibility, filterLinksByPermissions } from '@/utils/auth/filterByVisibility';

export type NavLink = { to: string; icon: React.ComponentType<{ className?: string }>; label: string };
export type NavGroup = { key: string; label: string | null; items: NavLink[] };

function groupLinks<L extends NavLink>(
  links: L[],
  routeToGroup: Record<string, string>,
  groupOrder: readonly string[],
  groupLabels: Record<string, string>,
): NavGroup[] {
  const ungrouped: L[] = [];
  const buckets: Record<string, L[]> = {};
  for (const link of links) {
    const key = routeToGroup[link.to];
    if (key && groupOrder.includes(key)) {
      (buckets[key] ||= []).push(link);
    } else {
      ungrouped.push(link);
    }
  }
  const groups: NavGroup[] = [];
  // ungrouped (e.g. Home) appears first without a label
  if (ungrouped.length) groups.push({ key: '_top', label: null, items: ungrouped });
  for (const key of groupOrder) {
    if (buckets[key]?.length) {
      groups.push({ key, label: groupLabels[key] ?? key, items: buckets[key] });
    }
  }
  return groups;
}

export function useNavLinks() {
  const { role } = useAuth();
  const { getJsonSetting } = useAppSettings();
  const { adminSections: sectionsVisibility, beneficiarySections } = useSectionsVisibility();
  const { getPermissionsForRole } = useRolePermissions();

  const menuLabels = getJsonSetting<MenuLabels>('menu_labels', defaultMenuLabels);

  const { links, groups } = useMemo(() => {
    const applyLabels = <L extends NavLink>(items: L[]): L[] =>
      items.map(link => {
        const labelKey = linkLabelKeys[link.to];
        return { ...link, label: (labelKey && menuLabels[labelKey]) || link.label };
      });

    if (role === 'admin') {
      const filtered = filterLinksBySectionVisibility(allAdminLinks, ADMIN_ROUTE_TO_SECTION, sectionsVisibility);
      const labelled = applyLabels(filtered);
      return {
        links: labelled,
        groups: groupLinks(labelled, ADMIN_ROUTE_GROUPS, ADMIN_GROUP_ORDER, ADMIN_GROUP_LABELS),
      };
    }

    if (role === 'accountant') {
      const perms = getPermissionsForRole('accountant');
      const withoutExcluded = allAdminLinks.filter(link => !ACCOUNTANT_EXCLUDED_ROUTES.includes(link.to));
      const bySection = filterLinksBySectionVisibility(withoutExcluded, ADMIN_ROUTE_TO_SECTION, sectionsVisibility);
      const byPerms = filterLinksByPermissions(bySection, ADMIN_ROUTE_PERM_KEYS, perms ?? {});
      const labelled = applyLabels(byPerms);
      return {
        links: labelled,
        groups: groupLinks(labelled, ADMIN_ROUTE_GROUPS, ADMIN_GROUP_ORDER, ADMIN_GROUP_LABELS),
      };
    }

    const roleKey = role === 'waqif' ? 'waqif' : 'beneficiary';
    const perms = getPermissionsForRole(roleKey);
    const remapped = allBeneficiaryLinks.map(link =>
      role === 'waqif' && link.to === '/beneficiary' ? { ...link, to: '/waqif' } : link,
    );
    const bySection = filterLinksBySectionVisibility(remapped, BENEFICIARY_ROUTE_TO_SECTION, beneficiarySections);
    const final = filterLinksByPermissions(bySection, BENEFICIARY_ROUTE_PERM_KEYS, perms);
    const labelled = applyLabels(final);
    // For beneficiaries the route map uses '/beneficiary/*' but the home is remapped to '/waqif' for waqif.
    // Build a route-to-group map that also handles '/waqif' as ungrouped (top).
    return {
      links: labelled,
      groups: groupLinks(labelled, BENEFICIARY_ROUTE_GROUPS, BENEFICIARY_GROUP_ORDER, BENEFICIARY_GROUP_LABELS),
    };
  }, [role, getPermissionsForRole, menuLabels, sectionsVisibility, beneficiarySections]);

  // Backwards-compat: hook historically returned the flat array directly.
  // We preserve that behavior while attaching `.groups` for new consumers.
  return Object.assign(links as NavLink[], { groups });
}
