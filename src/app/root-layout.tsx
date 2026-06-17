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
import { useAuth } from "@/hooks/auth/session/useAuthContext";
import { ADMIN_ROLES } from "@/constants/roles";

const AiAssistant = lazyWithRetry(() => import("@/components/dashboard/AiAssistant"));
const SecurityGuard = lazyWithRetry(() => import("@/components/auth/SecurityGuard"));
const PwaUpdateNotifier = lazyWithRetry(() => import("@/components/pwa/PwaUpdateNotifier"));
const SwUpdateBanner = lazyWithRetry(() => import("@/components/pwa/SwUpdateBanner"));
const AuditModeOverlay = lazyWithRetry(() => import("@/components/diagnostics/AuditModeOverlay"));

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
      <OfflineBanner />
      <ErrorBoundary>
        <Suspense fallback={null}><SwUpdateBanner /></Suspense>
      </ErrorBoundary>
      <PagePerformanceTracker />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={null}><SecurityGuard /></Suspense>
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
