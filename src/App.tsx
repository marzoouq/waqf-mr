import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/auth/useAuthContext";
import { FiscalYearProvider } from "@/contexts/FiscalYearContext";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { usePagePerformance } from "@/hooks/ui/usePagePerformance";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import DeferredRender from '@/components/common/DeferredRender';
import { ADMIN_ROLES } from '@/constants/roles';

// ملفات المسارات المقسّمة
import { publicRoutes, catchAllRoute } from "@/routes/publicRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import { beneficiaryRoutes } from "@/routes/beneficiaryRoutes";

/** مكوّن يتتبع أداء تحميل الصفحات */
function PagePerformanceTracker() {
  usePagePerformance();
  return null;
}

// AI Assistant & Security - Lazy loaded
const AiAssistant = lazyWithRetry(() => import("./components/ai/AiAssistant"));
const SecurityGuard = lazyWithRetry(() => import("./components/auth/SecurityGuard"));
const PwaUpdateNotifier = lazyWithRetry(() => import("./components/pwa/PwaUpdateNotifier"));
const SwUpdateBanner = lazyWithRetry(() => import("./components/pwa/SwUpdateBanner"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

/** يحمّل AiAssistant فقط لأدوار admin/accountant لتوفير JS */
function RoleGatedAiAssistant() {
  const { role } = useAuth();
  if (!role || !(ADMIN_ROLES as readonly string[]).includes(role)) return null;
  return (
    <DeferredRender>
      <Suspense fallback={null}>
        <AiAssistant />
      </Suspense>
    </DeferredRender>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" storageKey="waqf-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FiscalYearProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter>
                <ErrorBoundary>
                  <Suspense fallback={null}>
                    <SwUpdateBanner />
                  </Suspense>
                </ErrorBoundary>
                <PagePerformanceTracker />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {publicRoutes}
                    {adminRoutes}
                    {beneficiaryRoutes}
                    {catchAllRoute}
                  </Routes>
                </Suspense>
                <ErrorBoundary>
                  <Suspense fallback={null}>
                    <SecurityGuard />
                  </Suspense>
                </ErrorBoundary>
                <ErrorBoundary>
                  <Suspense fallback={null}>
                    <PwaUpdateNotifier />
                  </Suspense>
                </ErrorBoundary>
                <ErrorBoundary>
                  <RoleGatedAiAssistant />
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </FiscalYearProvider>
        </AuthProvider>
      </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
