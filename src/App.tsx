import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/auth/useAuthContext";
import { FiscalYearProvider } from "@/contexts/FiscalYearContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagePerformance } from "@/hooks/ui/usePagePerformance";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import DeferredRender from '@/components/DeferredRender';

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
const AiAssistant = lazyWithRetry(() => import("./components/AiAssistant"));
const SecurityGuard = lazyWithRetry(() => import("./components/SecurityGuard"));
const PwaUpdateNotifier = lazyWithRetry(() => import("./components/PwaUpdateNotifier"));
const SwUpdateBanner = lazyWithRetry(() => import("./components/SwUpdateBanner"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 animate-fade-in" dir="rtl">
      {/* شريط علوي */}
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      {/* بطاقات إحصائية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
      {/* محتوى رئيسي */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <Skeleton className="h-5 w-32 mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-24 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
