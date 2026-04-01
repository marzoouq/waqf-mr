import { Route } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { withRouteErrorBoundary as eb } from "./withRouteErrorBoundary";

/* صفحات الدخول الأساسية — eager لتسريع أول رسم */
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";

const Unauthorized = lazyWithRetry(() => import("@/pages/Unauthorized"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));
const PrivacyPolicy = lazyWithRetry(() => import("@/pages/PrivacyPolicy"));
const TermsOfUse = lazyWithRetry(() => import("@/pages/TermsOfUse"));
const InstallApp = lazyWithRetry(() => import("@/pages/InstallApp"));
const ResetPassword = lazyWithRetry(() => import("@/pages/ResetPassword"));

/* تحميل مسبق للصفحات الأكثر زيارة بعد الإقلاع */
if (typeof requestIdleCallback !== 'undefined') {
  requestIdleCallback(() => {
    import("@/pages/dashboard/AdminDashboard");
    import("@/pages/beneficiary/BeneficiaryDashboard");
  });
}

export const publicRoutes = (
  <>
    <Route path="/" element={eb(<Index />)} />
    <Route path="/auth" element={eb(<Auth />)} />
    <Route path="/unauthorized" element={eb(<Unauthorized />)} />
    <Route path="/privacy" element={eb(<PrivacyPolicy />)} />
    <Route path="/terms" element={eb(<TermsOfUse />)} />
    <Route path="/install" element={eb(<InstallApp />)} />
    <Route path="/reset-password" element={eb(<ResetPassword />)} />
  </>
);

export const catchAllRoute = <Route path="*" element={eb(<NotFound />)} />;
