import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FiscalYearProvider } from "@/contexts/FiscalYearContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { usePagePerformance } from "@/hooks/ui/usePagePerformance";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { setPerformanceToast } from "@/lib/performanceMonitor";
import { toast as sonnerToast } from "sonner";

// ملفات المسارات المقسّمة
import { publicRoutes, catchAllRoute } from "@/routes/publicRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import { beneficiaryRoutes } from "@/routes/beneficiaryRoutes";

// ربط دالة التنبيه بمراقب الأداء
setPerformanceToast((msg, opts) => sonnerToast.warning(msg, opts));

/** مكوّن يتتبع أداء تحميل الصفحات */
function PagePerformanceTracker() {
  usePagePerformance();
  return null;
}

// AI Assistant & Security - Lazy loaded
const AiAssistant = lazyWithRetry(() => import("./components/AiAssistant"));
const SecurityGuard = lazyWithRetry(() => import("./components/SecurityGuard"));
const PwaUpdateNotifier = lazyWithRetry(() => import("./components/PwaUpdateNotifier"));
const SwUpdateBanner = lazyWithRetry(() => import("./components/SwUpdateBanner"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

import DeferredRender from '@/components/DeferredRender';

/** يحمّل AiAssistant فقط لأدوار admin/accountant لتوفير JS */
function RoleGatedAiAssistant() {
  const { role } = useAuth();
  if (!role || !['admin', 'accountant'].includes(role)) return null;
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
