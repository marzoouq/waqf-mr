/**
 * Root Layout — M1.1 (Version I-R)
 * يحتوي العناصر المشتركة عبر كل المسارات: OfflineBanner, SwUpdateBanner,
 * PerformanceTracker, SecurityGuard, PwaUpdateNotifier, RoleGatedAiAssistant.
 */
import { DeferredRender, ErrorBoundary, OfflineBanner, PageLoader } from '@/components/common';
import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { usePagePerformance } from "@/hooks/ui/usePagePerformance";
import { usePageActivityTracker } from "@/hooks/data/audit/usePageActivityTracker";
import { useAuth } from "@/hooks/auth/session/useAuthContext";
import { ADMIN_ROLES } from "@/constants/roles";

const AiAssistant = lazyWithRetry(() => import("@/components/dashboard/AiAssistant"));
const SecurityGuard = lazyWithRetry(() => import("@/components/auth/SecurityGuard"));
const IpBlockGuard = lazyWithRetry(() => import("@/components/auth/IpBlockGuard"));
const PwaUpdateNotifier = lazyWithRetry(() => import("@/components/pwa/PwaUpdateNotifier"));
const SwUpdateBanner = lazyWithRetry(() => import("@/components/pwa/SwUpdateBanner"));
const AuditModeOverlay = lazyWithRetry(() => import("@/components/diagnostics/AuditModeOverlay"));
const MaintenanceBanner = lazyWithRetry(() => import("@/components/common/MaintenanceBanner"));

/** يتتبع تحركات المستخدم (زيارات الصفحات ومدة البقاء) */
function ActivityTracker() {
  usePageActivityTracker();
  return null;
}

/** يتتبع أداء تحميل الصفحات */
function PagePerformanceTracker() {
  usePagePerformance();
  return null;
}

/** يحمّل AiAssistant فقط لأدوار admin/accountant لتوفير JS */
function RoleGatedAiAssistant() {
  const { role } = useAuth();
  if (!role || !(ADMIN_ROLES as readonly string[]).includes(role)) return null;
  return (
    <DeferredRender delay={200}>
      <Suspense fallback={null}>
        <AiAssistant />
      </Suspense>
    </DeferredRender>
  );
}

export function RootLayout() {
  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={null}><MaintenanceBanner /></Suspense>
      </ErrorBoundary>
      <OfflineBanner />
      <ErrorBoundary>
        <Suspense fallback={null}><SwUpdateBanner /></Suspense>
      </ErrorBoundary>
      <PagePerformanceTracker />
      <ErrorBoundary>
        <ActivityTracker />
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <div className="animate-page-in">
            <Outlet />
          </div>
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={null}><SecurityGuard /></Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={null}><IpBlockGuard /></Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={null}><PwaUpdateNotifier /></Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <RoleGatedAiAssistant />
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={null}><AuditModeOverlay /></Suspense>
      </ErrorBoundary>
    </>
  );
}
