import { Route } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const Index = lazyWithRetry(() => import("@/pages/Index"));
const Auth = lazyWithRetry(() => import("@/pages/Auth"));
const Unauthorized = lazyWithRetry(() => import("@/pages/Unauthorized"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));
const PrivacyPolicy = lazyWithRetry(() => import("@/pages/PrivacyPolicy"));
const TermsOfUse = lazyWithRetry(() => import("@/pages/TermsOfUse"));
const InstallApp = lazyWithRetry(() => import("@/pages/InstallApp"));
const ResetPassword = lazyWithRetry(() => import("@/pages/ResetPassword"));

export const publicRoutes = (
  <>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/terms" element={<TermsOfUse />} />
    <Route path="/install" element={<InstallApp />} />
    <Route path="/reset-password" element={<ResetPassword />} />
  </>
);

export const catchAllRoute = <Route path="*" element={<NotFound />} />;
