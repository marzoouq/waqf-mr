import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FiscalYearProvider } from "@/contexts/FiscalYearContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense, useState, useEffect, type ComponentType } from "react";
import { Loader2 } from "lucide-react";

// ─── تعافي تلقائي عند فشل تحميل chunk قديم ───
function lazyWithRetry(importFn: () => Promise<{ default: ComponentType }>) {
  return lazy(() =>
    importFn().catch((error: Error) => {
      const isChunkError =
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Loading chunk') ||
        error.message.includes('error loading dynamically imported module');

      if (isChunkError) {
        const retried = sessionStorage.getItem('chunk_retry');
        if (!retried) {
          sessionStorage.setItem('chunk_retry', '1');
          // مسح كاش الأصول القديمة فقط
          caches.delete('static-assets').catch(() => {});
          window.location.reload();
          // إرجاع وعد لا ينتهي لمنع عرض خطأ قبل إعادة التحميل
          return new Promise(() => {});
        }
        // إذا فشلت المحاولة الثانية، أزل الحارس وارمي الخطأ
        sessionStorage.removeItem('chunk_retry');
      }
      throw error;
    })
  );
}

// مسح حارس إعادة المحاولة عند التحميل الناجح
sessionStorage.removeItem('chunk_retry');

// Pages - Lazy loaded
const Index = lazyWithRetry(() => import("./pages/Index"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Unauthorized = lazyWithRetry(() => import("./pages/Unauthorized"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazyWithRetry(() => import("./pages/TermsOfUse"));
const InstallApp = lazyWithRetry(() => import("./pages/InstallApp"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));

// Admin Dashboard Pages - Lazy loaded
const AdminDashboard = lazyWithRetry(() => import("./pages/dashboard/AdminDashboard"));
const PropertiesPage = lazyWithRetry(() => import("./pages/dashboard/PropertiesPage"));
const ContractsPage = lazyWithRetry(() => import("./pages/dashboard/ContractsPage"));
const IncomePage = lazyWithRetry(() => import("./pages/dashboard/IncomePage"));
const ExpensesPage = lazyWithRetry(() => import("./pages/dashboard/ExpensesPage"));
const BeneficiariesPage = lazyWithRetry(() => import("./pages/dashboard/BeneficiariesPage"));
const ReportsPage = lazyWithRetry(() => import("./pages/dashboard/ReportsPage"));
const AccountsPage = lazyWithRetry(() => import("./pages/dashboard/AccountsPage"));
const UserManagementPage = lazyWithRetry(() => import("./pages/dashboard/UserManagementPage"));
const SettingsPage = lazyWithRetry(() => import("./pages/dashboard/SettingsPage"));
const MessagesPage = lazyWithRetry(() => import("./pages/dashboard/MessagesPage"));
const InvoicesPage = lazyWithRetry(() => import("./pages/dashboard/InvoicesPage"));
const AuditLogPage = lazyWithRetry(() => import("./pages/dashboard/AuditLogPage"));
const BylawsPage = lazyWithRetry(() => import("./pages/dashboard/BylawsPage"));
const ZatcaManagementPage = lazyWithRetry(() => import("./pages/dashboard/ZatcaManagementPage"));
const SupportDashboardPage = lazyWithRetry(() => import("./pages/dashboard/SupportDashboardPage"));
const AnnualReportPage = lazyWithRetry(() => import("./pages/dashboard/AnnualReportPage"));
const ChartOfAccountsPage = lazyWithRetry(() => import("./pages/dashboard/ChartOfAccountsPage"));
const HistoricalComparisonPage = lazyWithRetry(() => import("./pages/dashboard/HistoricalComparisonPage"));

// Beneficiary Pages - Lazy loaded
const BeneficiaryDashboard = lazyWithRetry(() => import("./pages/beneficiary/BeneficiaryDashboard"));
const DisclosurePage = lazyWithRetry(() => import("./pages/beneficiary/DisclosurePage"));
const MySharePage = lazyWithRetry(() => import("./pages/beneficiary/MySharePage"));
const FinancialReportsPage = lazyWithRetry(() => import("./pages/beneficiary/FinancialReportsPage"));
const AccountsViewPage = lazyWithRetry(() => import("./pages/beneficiary/AccountsViewPage"));
const BeneficiarySettingsPage = lazyWithRetry(() => import("./pages/beneficiary/BeneficiarySettingsPage"));
const BeneficiaryMessagesPage = lazyWithRetry(() => import("./pages/beneficiary/BeneficiaryMessagesPage"));
const InvoicesViewPage = lazyWithRetry(() => import("./pages/beneficiary/InvoicesViewPage"));
const NotificationsPage = lazyWithRetry(() => import("./pages/beneficiary/NotificationsPage"));
const BylawsViewPage = lazyWithRetry(() => import("./pages/beneficiary/BylawsViewPage"));
const PropertiesViewPage = lazyWithRetry(() => import("./pages/beneficiary/PropertiesViewPage"));
const ContractsViewPage = lazyWithRetry(() => import("./pages/beneficiary/ContractsViewPage"));
const CarryforwardHistoryPage = lazyWithRetry(() => import("./pages/beneficiary/CarryforwardHistoryPage"));
const WaqifDashboard = lazyWithRetry(() => import("./pages/beneficiary/WaqifDashboard"));
const BeneficiarySupportPage = lazyWithRetry(() => import("./pages/beneficiary/SupportPage"));
const AnnualReportViewPage = lazyWithRetry(() => import("./pages/beneficiary/AnnualReportViewPage"));

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

/** Renders children only after a delay so non-critical JS doesn't block initial paint */
function DeferredRender({ children, delay = 3000 }: { children: React.ReactNode; delay?: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timerId: number;
    if (window.requestIdleCallback) {
      timerId = window.requestIdleCallback(() => setReady(true), { timeout: delay });
    } else {
      timerId = window.setTimeout(() => setReady(true), delay) as unknown as number;
    }
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(timerId);
      else window.clearTimeout(timerId);
    };
  }, [delay]);
  if (!ready) return null;
  return <>{children}</>;
}


function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FiscalYearProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ErrorBoundary>
                <Suspense fallback={null}>
                  <SwUpdateBanner />
                </Suspense>
              </ErrorBoundary>
              <BrowserRouter>
                <PagePerformanceTracker />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfUse />} />
                    <Route path="/install" element={<InstallApp />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* Admin & Accountant Routes */}
                    <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/dashboard/properties" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><PropertiesPage /></ProtectedRoute>} />
                    <Route path="/dashboard/contracts" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><ContractsPage /></ProtectedRoute>} />
                    <Route path="/dashboard/income" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><IncomePage /></ProtectedRoute>} />
                    <Route path="/dashboard/expenses" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><ExpensesPage /></ProtectedRoute>} />
                    <Route path="/dashboard/beneficiaries" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><BeneficiariesPage /></ProtectedRoute>} />
                    <Route path="/dashboard/reports" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><ReportsPage /></ProtectedRoute>} />
                    <Route path="/dashboard/accounts" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><AccountsPage /></ProtectedRoute>} />
                    <Route path="/dashboard/messages" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><MessagesPage /></ProtectedRoute>} />
                    <Route path="/dashboard/invoices" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><InvoicesPage /></ProtectedRoute>} />
                    <Route path="/dashboard/audit-log" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><AuditLogPage /></ProtectedRoute>} />
                    <Route path="/dashboard/bylaws" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><BylawsPage /></ProtectedRoute>} />

                    {/* Admin Only */}
                    <Route path="/dashboard/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
                    <Route path="/dashboard/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
                    <Route path="/dashboard/zatca" element={<ProtectedRoute allowedRoles={['admin']}><ZatcaManagementPage /></ProtectedRoute>} />
                    <Route path="/dashboard/support" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><SupportDashboardPage /></ProtectedRoute>} />
                    <Route path="/dashboard/annual-report" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><AnnualReportPage /></ProtectedRoute>} />
                    <Route path="/dashboard/chart-of-accounts" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><ChartOfAccountsPage /></ProtectedRoute>} />
                    <Route path="/dashboard/comparison" element={<ProtectedRoute allowedRoles={['admin', 'accountant']}><HistoricalComparisonPage /></ProtectedRoute>} />

                    {/* Beneficiary Routes (admin can also access) */}
                    <Route path="/beneficiary" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary']}><BeneficiaryDashboard /></ProtectedRoute>} />
                    <Route path="/waqif" element={<ProtectedRoute allowedRoles={['admin', 'waqif']}><WaqifDashboard /></ProtectedRoute>} />
                    <Route path="/beneficiary/properties" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><PropertiesViewPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/contracts" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><ContractsViewPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/disclosure" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary']}><DisclosurePage /></ProtectedRoute>} />
                    <Route path="/beneficiary/my-share" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary']}><MySharePage /></ProtectedRoute>} />
                    <Route path="/beneficiary/financial-reports" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><FinancialReportsPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/accounts" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><AccountsViewPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/settings" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><BeneficiarySettingsPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/messages" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><BeneficiaryMessagesPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/invoices" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><InvoicesViewPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/notifications" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><NotificationsPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/bylaws" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><BylawsViewPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/carryforward" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><CarryforwardHistoryPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/support" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif', 'accountant']}><BeneficiarySupportPage /></ProtectedRoute>} />
                    <Route path="/beneficiary/annual-report" element={<ProtectedRoute allowedRoles={['admin', 'beneficiary', 'waqif']}><AnnualReportViewPage /></ProtectedRoute>} />

                    {/* Catch-all Route */}
                    <Route path="*" element={<NotFound />} />
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
                  <DeferredRender>
                    <Suspense fallback={null}>
                      <AiAssistant />
                    </Suspense>
                  </DeferredRender>
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </FiscalYearProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
