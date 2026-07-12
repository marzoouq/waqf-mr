/**
 * مسارات لوحة الدعم الفني — دور support (والناظر admin بامتياز شامل)
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { pr } from './ProtectedRouteHelper';
import { SUPPORT_ROLES } from '@/constants/roles';

const SupportDashboard = lazyWithRetry(() => import('@/pages/support/SupportDashboard'));
const SupportTicketsPage = lazyWithRetry(() => import('@/pages/support/SupportTicketsPage'));
const SupportDiagnosticsPage = lazyWithRetry(() => import('@/pages/support/SupportDiagnosticsPage'));
const SupportMaintenancePage = lazyWithRetry(() => import('@/pages/support/SupportMaintenancePage'));
const SupportErrorsPage = lazyWithRetry(() => import('@/pages/support/SupportErrorsPage'));

/** مسارات دور الدعم الفني */
export const supportRoutes = (
  <>
    <Route path="/support" element={pr(SUPPORT_ROLES, <SupportDashboard />, false)} />
    <Route path="/support/tickets" element={pr(SUPPORT_ROLES, <SupportTicketsPage />, false)} />
    <Route path="/support/diagnostics" element={pr(SUPPORT_ROLES, <SupportDiagnosticsPage />, false)} />
    <Route path="/support/maintenance" element={pr(SUPPORT_ROLES, <SupportMaintenancePage />, false)} />
    <Route path="/support/errors" element={pr(SUPPORT_ROLES, <SupportErrorsPage />, false)} />
  </>
);
