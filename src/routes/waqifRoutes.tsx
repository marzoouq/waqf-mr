import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { withRouteErrorBoundary as eb } from "./withRouteErrorBoundary";

import type { ReactNode } from 'react';
import type { AppRole } from '@/types/database';

const WaqifDashboard = lazyWithRetry(() => import("@/pages/beneficiary/WaqifDashboard"));

const pr = (roles: AppRole[], page: ReactNode) =>
  eb(<ProtectedRoute allowedRoles={roles}>{page}</ProtectedRoute>);

/** مسارات الواقف */
export const waqifRoutes = (
  <>
    <Route path="/waqif" element={pr(['admin', 'waqif'] as AppRole[], <WaqifDashboard />)} />
  </>
);
