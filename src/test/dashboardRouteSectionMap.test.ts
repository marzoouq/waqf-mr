/**
 * Parity test — يضمن أن كل مسار `/dashboard/*` مُعرَّف في routeRegistry
 * (وبالتالي يظهر في ADMIN_ROUTE_TO_SECTION) لمنع drift مستقبلي بين
 * adminLinks والـ section visibility map.
 */
import { describe, it, expect } from 'vitest';
import { allAdminLinks, ADMIN_ROUTE_TO_SECTION } from '@/constants/navigation';
import { ADMIN_ROUTES } from '@/constants/routeRegistry';

describe('dashboard route ↔ section parity', () => {
  it('every /dashboard/* link is registered in ADMIN_ROUTES', () => {
    const dashboardLinks = allAdminLinks
      .map(l => l.to)
      .filter(to => to.startsWith('/dashboard'));
    const missing = dashboardLinks.filter(to => !(to in ADMIN_ROUTES));
    expect(missing, `missing in routeRegistry: ${missing.join(', ')}`).toEqual([]);
  });

  it('every non-root /dashboard/* route maps to a section key', () => {
    const routes = Object.keys(ADMIN_ROUTES).filter(r => r !== '/dashboard');
    const missing = routes.filter(r => !ADMIN_ROUTE_TO_SECTION[r]);
    expect(missing, `missing section key: ${missing.join(', ')}`).toEqual([]);
  });
});
