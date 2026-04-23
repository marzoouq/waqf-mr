import { Route } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { pr } from "./ProtectedRouteHelper";

import type { AppRole } from '@/types/database';

const WaqifDashboard = lazyWithRetry(() => import("@/pages/beneficiary/WaqifDashboard"));

/** مسارات الواقف — بدون RequirePermission (withPermission=false) */
export const waqifRoutes = (
  <>
    <Route path="/waqif" element={pr(['admin', 'waqif'] as AppRole[], <WaqifDashboard />, false)} />
  </>
);
