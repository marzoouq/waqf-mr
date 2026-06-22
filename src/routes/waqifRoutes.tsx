import { Route } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { pr } from "./ProtectedRouteHelper";
import { WAQIF_ROLES } from "@/constants/roles";

const WaqifDashboard = lazyWithRetry(() => import("@/pages/waqif/WaqifDashboard"));

/** مسارات الواقف — بدون RequirePermission (withPermission=false) */
export const waqifRoutes = (
  <>
    <Route path="/waqif" element={pr(WAQIF_ROLES, <WaqifDashboard />, false)} />
  </>
);
