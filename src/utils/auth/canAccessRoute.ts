/**
 * canAccessRoute — دالة pure لفحص وصول دور إلى مسار
 *
 * مصدر منطقي وحيد لاختبارات الوصول. لا تستورد React ولا hooks ولا I/O.
 * تحاكي منطق ProtectedRoute (role gate) + RequirePermission/usePermissionCheck (perm + section).
 *
 * - admin: يمر دائماً (قاعدة المشروع الموثقة).
 * - role gate: الدور يجب أن يكون في ROUTE_ROLES[route].
 * - permission gate: إن كان للمسار permKey، يجب أن يكون rolePerms[role][permKey] !== false.
 * - section gate: إن كان للمسار sectionKey، يجب أن يكون sections[sectionKey] !== false.
 */
import type { AppRole } from '@/types';
import { ROUTE_ROLES } from '@/constants/routeRoles';
import { ALL_ROUTES } from '@/constants/routeRegistry';

export type AccessBasis =
  | 'admin-override'
  | 'role-only'
  | 'role+permission'
  | 'role+section'
  | 'role+permission+section'
  | 'uncontrolled'
  | 'denied-role'
  | 'denied-permission'
  | 'denied-section'
  | 'unknown-route';

export interface AccessInput {
  role: AppRole | null | undefined;
  route: string;
  /** Effective per-role perms: rolePerms[role][permKey] === false → blocked. */
  rolePerms?: Record<string, Record<string, boolean>>;
  /** Admin sections visibility: false → hidden. */
  adminSections?: Record<string, boolean>;
  /** Beneficiary sections visibility: false → hidden. */
  beneficiarySections?: Record<string, boolean>;
}

export interface AccessResult {
  allowed: boolean;
  basis: AccessBasis;
}

export function evaluateAccess(input: AccessInput): AccessResult {
  const { role, route, rolePerms, adminSections, beneficiarySections } = input;

  if (!role) return { allowed: false, basis: 'denied-role' };

  // قاعدة مشروع موثّقة: admin يتجاوز كل الحراس.
  if (role === 'admin') return { allowed: true, basis: 'admin-override' };

  const reachable = ROUTE_ROLES[route];
  if (!reachable) return { allowed: false, basis: 'unknown-route' };

  if (!reachable.includes(role)) return { allowed: false, basis: 'denied-role' };

  const meta = ALL_ROUTES[route];
  const permKey = meta?.permKey;
  const sectionKey = meta?.sectionKey;

  // permission gate
  if (permKey) {
    const perms = rolePerms?.[role];
    if (perms && perms[permKey] === false) {
      return { allowed: false, basis: 'denied-permission' };
    }
  }

  // section gate
  if (sectionKey) {
    const sections = role === 'beneficiary' || role === 'waqif' ? beneficiarySections : adminSections;
    if (sections && sections[sectionKey] === false) {
      return { allowed: false, basis: 'denied-section' };
    }
  }

  if (permKey && sectionKey) return { allowed: true, basis: 'role+permission+section' };
  if (permKey) return { allowed: true, basis: 'role+permission' };
  if (sectionKey) return { allowed: true, basis: 'role+section' };
  return { allowed: true, basis: 'uncontrolled' };
}

/** نسخة مختصرة (boolean فقط) للحالات التي لا تحتاج تفصيل الـ basis. */
export function canAccessRoute(input: AccessInput): boolean {
  return evaluateAccess(input).allowed;
}
