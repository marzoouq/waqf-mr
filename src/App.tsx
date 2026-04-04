import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  Outlet,
} from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/auth/useAuthContext";
import { FiscalYearProvider } from "@/contexts/FiscalYearContext";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { Suspense } from "react";

import { usePagePerformance } from "@/hooks/ui/usePagePerformance";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import DeferredRender from '@/components/common/DeferredRender';
import OfflineBanner from '@/components/common/OfflineBanner';
import { ADMIN_ROLES } from '@/constants/roles';

// ملفات المسارات المقسّمة
import { publicRoutes, catchAllRoute } from "@/routes/publicRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import { beneficiaryRoutes } from "@/routes/beneficiaryRoutes";
import { waqifRoutes } from "@/routes/waqifRoutes";

/** مكوّن يتتبع أداء تحميل الصفحات */
function PagePerformanceTracker() {
  usePagePerformance();
  return null;
}

// تحميل كسول — AI + الأمان + PWA
const AiAssistant = lazyWithRetry(() => import("./components/ai/AiAssistant"));
const SecurityGuard = lazyWithRetry(() => import("./components/auth/SecurityGuard"));
const PwaUpdateNotifier = lazyWithRetry(() => import("./components/pwa/PwaUpdateNotifier"));
const SwUpdateBanner = lazyWithRetry(() => import("./components/pwa/SwUpdateBanner"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
      </div>
    </div>
  );
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

/** التخطيط الجذري — يحتوي على العناصر المشتركة + Outlet للمسارات */
function RootLayout() {
  return (
    <>
      <OfflineBanner />
      <ErrorBoundary>
        <Suspense fallback={null}><SwUpdateBanner /></Suspense>
      </ErrorBoundary>
      <PagePerformanceTracker />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
      <ErrorBoundary>
        <Suspense fallback={null}><SecurityGuard /></Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={null}><PwaUpdateNotifier /></Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <RoleGatedAiAssistant />
      </ErrorBoundary>
    </>
  );
}

// === إنشاء الراوتر باستخدام createBrowserRouter ===
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      {publicRoutes}
      {adminRoutes}
      {beneficiaryRoutes}
      {waqifRoutes}
      {catchAllRoute}
    </Route>
  )
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" storageKey="waqf-theme">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <FiscalYearProvider>
              <TooltipProvider>
                <Sonner />
                <RouterProvider router={router} />
              </TooltipProvider>
            </FiscalYearProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
